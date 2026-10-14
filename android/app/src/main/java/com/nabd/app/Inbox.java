package com.nabd.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.SystemClock;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;

// رسائل العيادة للمريض: يفحص الجوال كل ربع ساعة تقريباً (حتى والتطبيق مغلق)
// إن كانت هناك رسالة جديدة من العيادة فيُظهر إشعاراً. لا يحتاج خادماً مدفوعاً.
public class Inbox extends BroadcastReceiver {
    static final String PREFS = "nabd_inbox";
    static final String ACTION = "com.nabd.app.INBOX";
    static final String REFERER = "https://" + MainActivity.HOST + "/";

    static PendingIntent pending(Context c) {
        Intent i = new Intent(c, Inbox.class);
        i.setAction(ACTION);
        return PendingIntent.getBroadcast(c, 4242, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    // json فارغ = إيقاف (عند تسجيل الخروج)
    static void setup(Context c, String json) {
        SharedPreferences sp = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (json == null || json.isEmpty()) {
            sp.edit().clear().apply();
            am.cancel(pending(c));
            return;
        }
        boolean fresh = !sp.contains("cfg");
        sp.edit().putString("cfg", json).apply();
        schedule(c);
        // أول مرة: نحفظ آخر رسالة موجودة دون إشعار حتى لا تظهر رسائل قديمة
        checkAsync(c, !fresh);
    }

    static void schedule(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        am.setInexactRepeating(AlarmManager.ELAPSED_REALTIME_WAKEUP, SystemClock.elapsedRealtime() + AlarmManager.INTERVAL_FIFTEEN_MINUTES,
            AlarmManager.INTERVAL_FIFTEEN_MINUTES, pending(c));
    }

    static void checkAsync(Context c, boolean notify) {
        final Context app = c.getApplicationContext();
        new Thread(() -> { try { check(app, notify); } catch (Exception ignored) {} }).start();
    }

    @Override
    public void onReceive(Context c, Intent intent) {
        String a = intent.getAction();
        SharedPreferences sp = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!sp.contains("cfg")) return;
        if (Intent.ACTION_BOOT_COMPLETED.equals(a) || "android.intent.action.MY_PACKAGE_REPLACED".equals(a)) { schedule(c); return; }
        final PendingResult pr = goAsync();
        final Context app = c.getApplicationContext();
        new Thread(() -> {
            try { check(app, !MainActivity.visible); } catch (Exception ignored) {}
            finally { pr.finish(); }
        }).start();
    }

    static synchronized void check(Context c, boolean notify) throws Exception {
        SharedPreferences sp = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String raw = sp.getString("cfg", null);
        if (raw == null) return;
        JSONObject cfg = new JSONObject(raw);
        String key = cfg.getString("key"), project = cfg.getString("project");
        // رمز دخول جديد من رمز التحديث المحفوظ
        JSONObject tok = new JSONObject(http("POST", "https://securetoken.googleapis.com/v1/token?key=" + key, null,
            "application/x-www-form-urlencoded", "grant_type=refresh_token&refresh_token=" + URLEncoder.encode(cfg.getString("refresh"), "UTF-8")));
        String id = tok.getString("id_token");
        if (tok.has("refresh_token") && !tok.getString("refresh_token").equals(cfg.getString("refresh"))) {
            cfg.put("refresh", tok.getString("refresh_token"));
            sp.edit().putString("cfg", cfg.toString()).apply();
        }
        String base = "https://firestore.googleapis.com/v1/projects/" + project + "/databases/(default)/documents/";
        JSONArray paths = cfg.getJSONArray("paths");
        for (int k = 0; k < paths.length(); k++) {
            String path = paths.getString(k);
            JSONObject d = new JSONObject(http("GET", base + path + "?mask.fieldPaths=lastMsgAt&mask.fieldPaths=lastMsgFrom", id, null, null));
            JSONObject f = d.optJSONObject("fields");
            if (f == null) continue;
            String from = f.has("lastMsgFrom") ? f.getJSONObject("lastMsgFrom").optString("stringValue") : "";
            String at = f.has("lastMsgAt") ? f.getJSONObject("lastMsgAt").optString("timestampValue") : "";
            String seenK = "seen:" + path;
            if (!"clinic".equals(from) || at.isEmpty() || at.equals(sp.getString(seenK, ""))) continue;
            sp.edit().putString(seenK, at).apply();
            if (!notify) continue;
            String body = cfg.optString("fallback", "لديك رسالة جديدة من العيادة"), title = cfg.optString("clinic", "نبض");
            if (!cfg.optBoolean("hide")) {
                String q = "{\"structuredQuery\":{\"from\":[{\"collectionId\":\"messages\"}],\"orderBy\":[{\"field\":{\"fieldPath\":\"at\"},\"direction\":\"DESCENDING\"}],\"limit\":1}}";
                JSONArray res = new JSONArray(http("POST", base + path + ":runQuery", id, "application/json", q));
                JSONObject m = res.length() > 0 ? res.getJSONObject(0).optJSONObject("document") : null;
                if (m != null && m.has("fields")) {
                    JSONObject mf = m.getJSONObject("fields");
                    if (mf.has("text")) body = mf.getJSONObject("text").optString("stringValue", body);
                }
            }
            Reminders.show(c, "msg-" + path, title, body, "#/msgs");
        }
    }

    static String http(String method, String url, String bearer, String type, String body) throws Exception {
        HttpURLConnection h = (HttpURLConnection) new URL(url).openConnection();
        h.setRequestMethod(method);
        h.setConnectTimeout(15000);
        h.setReadTimeout(20000);
        h.setRequestProperty("Referer", REFERER);
        if (bearer != null) h.setRequestProperty("Authorization", "Bearer " + bearer);
        if (body != null) {
            h.setDoOutput(true);
            h.setRequestProperty("Content-Type", type);
            try (OutputStream o = h.getOutputStream()) { o.write(body.getBytes("UTF-8")); }
        }
        int code = h.getResponseCode();
        InputStream in = code < 400 ? h.getInputStream() : h.getErrorStream();
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        if (in != null) { byte[] buf = new byte[8192]; int n; while ((n = in.read(buf)) > 0) bo.write(buf, 0, n); in.close(); }
        if (code >= 400) throw new Exception("HTTP " + code);
        return bo.toString("UTF-8");
    }
}
