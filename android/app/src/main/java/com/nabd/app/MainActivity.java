package com.nabd.app;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationManager;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.view.Gravity;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.ImageView;
import org.json.JSONObject;
import java.util.ArrayList;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

// تطبيق نبض: يفتح المنصة نفسها الموجودة على الموقع، وكل شيء متزامن
public class MainActivity extends Activity {
    static final String HOME = "https://mohamedfayzyasenalsabagh-create.github.io/nabd/";
    static final String HOST = "mohamedfayzyasenalsabagh-create.github.io";
    static final int FILE_REQ = 7;
    static final int MIC_REQ = 8, NOTIF_REQ = 9;
    WebView web;
    ValueCallback<Uri[]> fileCb;
    View splash;
    SpeechRecognizer speech;
    String pendingDictation;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        web = new WebView(this);
        FrameLayout root = new FrameLayout(this);
        root.addView(web);
        splash = buildSplash();
        root.addView(splash);
        setContentView(root);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMediaPlaybackRequiresUserGesture(false);
        if (Build.VERSION.SDK_INT >= 23) s.setOffscreenPreRaster(true);
        s.setUserAgentString(s.getUserAgentString() + " NabdApp/1");
        web.addJavascriptInterface(new Bridge(), "AndroidApp");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (HOST.equals(u.getHost())) return false;
                openExternal(u);
                return true;
            }
            @Override
            public void onPageFinished(WebView v, String url) {
                // الطباعة وحفظ PDF من داخل التطبيق
                v.evaluateJavascript("window.print = function(){ AndroidApp.print(document.title || 'clinic'); };", null);
                hideSplash();
            }
            @Override
            public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (r.isForMainFrame()) {
                    hideSplash();
                    v.loadData("<html dir='rtl'><body style='font-family:sans-serif;text-align:center;padding:40px;color:#1B2221;background:#F5F6F4'>"
                        + "<h2 style='color:#0E7C7B'>لا يوجد اتصال بالإنترنت</h2><p>تحقق من الاتصال وحاول مجدداً.</p>"
                        + "<button style='padding:12px 24px;border-radius:12px;border:0;background:#0E7C7B;color:#fff;font-size:16px' onclick=\"location.href='" + HOME + "'\">إعادة المحاولة</button></body></html>",
                        "text/html; charset=utf-8", "UTF-8");
                }
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                try {
                    startActivityForResult(p.createIntent(), FILE_REQ);
                } catch (ActivityNotFoundException e) {
                    fileCb = null;
                    return false;
                }
                return true;
            }
        });

        if (b != null) web.restoreState(b); else web.loadUrl(HOME);
        web.postDelayed(this::hideSplash, 8000);
    }

    void openExternal(Uri u) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, u));
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, "لا يوجد تطبيق لفتح هذا الرابط", Toast.LENGTH_SHORT).show();
        }
    }

    View buildSplash() {
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setGravity(Gravity.CENTER);
        l.setBackgroundColor(Color.parseColor("#0E7C7B"));
        ImageView ic = new ImageView(this);
        ic.setImageResource(R.mipmap.ic_launcher);
        int sz = (int) (96 * getResources().getDisplayMetrics().density);
        l.addView(ic, new LinearLayout.LayoutParams(sz, sz));
        TextView t = new TextView(this);
        t.setText("نبض");
        t.setTextColor(Color.WHITE);
        t.setTextSize(28);
        t.setGravity(Gravity.CENTER);
        t.setPadding(0, 24, 0, 24);
        l.addView(t);
        ProgressBar pb = new ProgressBar(this);
        l.addView(pb);
        return l;
    }

    void hideSplash() {
        if (splash == null || splash.getVisibility() == View.GONE) return;
        splash.animate().alpha(0f).setDuration(250).withEndAction(() -> splash.setVisibility(View.GONE)).start();
    }

    // ---------- الإملاء الصوتي ----------
    void startDictation(String id) {
        if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            pendingDictation = id;
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MIC_REQ);
            return;
        }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            dictationResult(id, null, "الإملاء الصوتي غير متاح على هذا الجهاز. ثبّت تطبيق Google وحاول مجدداً.");
            return;
        }
        if (speech != null) { speech.destroy(); speech = null; }
        speech = SpeechRecognizer.createSpeechRecognizer(this);
        speech.setRecognitionListener(new RecognitionListener() {
            public void onReadyForSpeech(Bundle p) { Toast.makeText(MainActivity.this, "تحدّث الآن…", Toast.LENGTH_SHORT).show(); }
            public void onBeginningOfSpeech() {}
            public void onRmsChanged(float v) {}
            public void onBufferReceived(byte[] b) {}
            public void onEndOfSpeech() {}
            public void onPartialResults(Bundle b) {}
            public void onEvent(int t, Bundle b) {}
            public void onError(int e) {
                String msg = e == SpeechRecognizer.ERROR_NO_MATCH || e == SpeechRecognizer.ERROR_SPEECH_TIMEOUT ? "لم يُلتقط أي كلام، حاول مجدداً"
                    : e == SpeechRecognizer.ERROR_NETWORK || e == SpeechRecognizer.ERROR_NETWORK_TIMEOUT ? "الإملاء يحتاج اتصالاً بالإنترنت"
                    : "تعذّر تشغيل الإملاء الصوتي";
                dictationResult(id, null, msg);
            }
            public void onResults(Bundle b) {
                ArrayList<String> r = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                dictationResult(id, r != null && !r.isEmpty() ? r.get(0) : "", null);
            }
        });
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ar-SY");
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "ar-SY");
        i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        speech.startListening(i);
    }

    void dictationResult(String id, String text, String err) {
        runOnUiThread(() -> web.evaluateJavascript("window.__dictResult && window.__dictResult("
            + JSONObject.quote(id) + "," + (text == null ? "null" : JSONObject.quote(text)) + ","
            + (err == null ? "null" : JSONObject.quote(err)) + ")", null));
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        super.onRequestPermissionsResult(req, perms, res);
        if (req == MIC_REQ && pendingDictation != null) {
            String id = pendingDictation; pendingDictation = null;
            if (res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED) startDictation(id);
            else dictationResult(id, null, "يلزم السماح باستخدام الميكروفون للإملاء الصوتي");
        }
        if (req == NOTIF_REQ) web.evaluateJavascript("window.__notifyChanged && window.__notifyChanged()", null);
    }

    String notifyState() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            return "default";
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        return nm.areNotificationsEnabled() ? "granted" : "denied";
    }

    @Override
    protected void onDestroy() {
        if (speech != null) speech.destroy();
        super.onDestroy();
    }

    class Bridge {
        @JavascriptInterface
        public void setFullscreen(final boolean on) {
            runOnUiThread(() -> {
                android.view.View d = getWindow().getDecorView();
                if (on) {
                    getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    d.setSystemUiVisibility(android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | android.view.View.SYSTEM_UI_FLAG_FULLSCREEN
                        | android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
                } else {
                    getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    d.setSystemUiVisibility(0);
                }
            });
        }
        @JavascriptInterface
        public void setReminders(String json) { Reminders.setAll(getApplicationContext(), json); }
        @JavascriptInterface
        public String notifyState() { return MainActivity.this.notifyState(); }
        @JavascriptInterface
        public void requestNotify() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= 33) requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIF_REQ);
                else web.evaluateJavascript("window.__notifyChanged && window.__notifyChanged()", null);
            });
        }
        @JavascriptInterface
        public void startDictation(String id) { runOnUiThread(() -> MainActivity.this.startDictation(id)); }
        @JavascriptInterface
        public void stopDictation() { runOnUiThread(() -> { if (speech != null) speech.stopListening(); }); }

        @JavascriptInterface
        public void print(final String title) {
            runOnUiThread(() -> {
                PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                PrintDocumentAdapter ad = web.createPrintDocumentAdapter(title);
                pm.print(title, ad, new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
            });
        }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == FILE_REQ && fileCb != null) {
            fileCb.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data));
            fileCb = null;
            return;
        }
        super.onActivityResult(req, res, data);
    }

    @Override
    protected void onSaveInstanceState(Bundle o) { super.onSaveInstanceState(o); web.saveState(o); }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
}
