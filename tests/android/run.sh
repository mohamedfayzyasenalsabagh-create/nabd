#!/bin/bash
# اختبار تطبيق أندرويد على جوال افتراضي: التثبيت، فتح التطبيق، النسخة التجريبية، التذكيرات، والعمل دون إنترنت
set -u
OUT=.results/android; mkdir -p $OUT
R=$OUT/result.txt; : > $R
ok(){ echo "PASS | $1" | tee -a $R; }; bad(){ echo "FAIL | $1" | tee -a $R; }
shot(){ adb exec-out screencap -p > $OUT/$1.png; }
APK=android/app/build/outputs/apk/debug/app-debug.apk
adb install -r $APK >/dev/null && ok "تثبيت التطبيق" || bad "تثبيت التطبيق"
adb shell pm grant com.nabd.app android.permission.POST_NOTIFICATIONS 2>/dev/null
start(){ adb shell am force-stop com.nabd.app; sleep 1; if [ -n "${1:-}" ]; then adb shell am start -n com.nabd.app/.MainActivity --es hash "'$1'" >/dev/null; else adb shell am start -n com.nabd.app/.MainActivity >/dev/null; fi; }
# 1) أول فتح مع الإنترنت: الصفحة الرئيسية وتثبيت نسخة التطبيق على الجوال
start; sleep 35; shot 1-home
adb shell dumpsys activity activities | grep -q "com.nabd.app/.MainActivity" && ok "فتح التطبيق" || bad "فتح التطبيق"
# 2) النسخة التجريبية: طبيب ثم مريض
start "demo/?as=doctor"; sleep 30; shot 2-demo-doctor
start "demo/?as=patient"; sleep 30; shot 3-demo-patient
# تذكيرات المريض (الأدوية والمواعيد) تُجدول على الجوال نفسه
N=$(adb shell dumpsys alarm | grep -c "com.nabd.app")
[ "$N" -gt 0 ] && ok "جدولة تذكيرات المريض على الجوال ($N منبه)" || bad "جدولة تذكيرات المريض على الجوال"
start "demo/?as=doctor"; sleep 25
# 3) قطع الإنترنت ثم فتح التطبيق من جديد
adb shell cmd connectivity airplane-mode enable 2>/dev/null || true
adb shell svc wifi disable; adb shell svc data disable; sleep 5
start "demo/?as=doctor"; sleep 30; shot 4-offline-doctor
start; sleep 25; shot 5-offline-home
adb shell svc wifi enable; adb shell svc data enable; adb shell cmd connectivity airplane-mode disable 2>/dev/null || true
sleep 10; start "demo/?as=doctor"; sleep 25; shot 6-back-online
adb shell dumpsys notification --noredact | grep -A3 "pkg=com.nabd.app" | head -20 > $OUT/notifications.txt || true
adb logcat -d | grep -iE "chromium|nabd|AndroidRuntime" | grep -iE "error|exception|fatal" | tail -40 > $OUT/logcat-errors.txt || true
grep -q "FATAL EXCEPTION" $OUT/logcat-errors.txt && bad "لا انهيار للتطبيق" || ok "لا انهيار للتطبيق"
