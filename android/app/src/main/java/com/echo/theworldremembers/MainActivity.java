package com.echo.theworldremembers;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

/**
 * ECHO – THE WORLD REMEMBERS
 * Main Native Android Activity
 *
 * Implements persistent Edge-to-Edge True Immersive Fullscreen:
 * 1. Fully hides the Status Bar (time, battery, notifications) and Navigation Bar (back/home/recents / gesture pill).
 * 2. Employs WindowInsetsControllerCompat with BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE (Immersive Sticky Mode).
 * 3. Supports display cutouts (notches / punch-holes) via LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES.
 * 4. Persists fullscreen through onResume, onWindowFocusChanged, and user touch interactions.
 * 5. Safely scoped only to the game's lifecycle without affecting the OS or other apps.
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Enforce true edge-to-edge window flags before view creation
        configureEdgeToEdgeWindow();
        super.onCreate(savedInstanceState);
        applyPersistentImmersiveMode();
    }

    @Override
    protected void onResume() {
        super.onResume();
        applyPersistentImmersiveMode();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyPersistentImmersiveMode();
        }
    }

    /**
     * Configures window flags for edge-to-edge display and notch / cutout handling.
     */
    private void configureEdgeToEdgeWindow() {
        Window window = getWindow();
        if (window == null) return;

        // Keep screen on during active gaming
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Hardware accelerated edge-to-edge layout across cutouts/notches (Android 9.0+ / API 28+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams params = window.getAttributes();
            params.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(params);
        }

        // Draw behind translucent/transparent system bars
        window.setStatusBarColor(android.graphics.Color.TRANSPARENT);
        window.setNavigationBarColor(android.graphics.Color.TRANSPARENT);

        // Notify Android system that app handles insets edge-to-edge
        WindowCompat.setDecorFitsSystemWindows(window, false);
    }

    /**
     * Applies persistent Immersive Sticky Fullscreen mode.
     * Hides both Status Bar and Navigation Bar continuously.
     */
    private void applyPersistentImmersiveMode() {
        Window window = getWindow();
        if (window == null) return;

        View decorView = window.getDecorView();
        if (decorView == null) return;

        // Modern Android API using AndroidX WindowCompat & WindowInsetsControllerCompat (Handles Android 11+ / API 30+ down to API 24)
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decorView);
        if (controller != null) {
            // BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE: Immersive Sticky mode.
            // Swiping from edges temporarily reveals transparent bars which auto-hide immediately.
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            controller.hide(WindowInsetsCompat.Type.systemBars());
            controller.hide(WindowInsetsCompat.Type.statusBars());
            controller.hide(WindowInsetsCompat.Type.navigationBars());
            controller.hide(WindowInsetsCompat.Type.displayCutout());
        }

        // Fallback backward-compatibility for system UI visibility flags (Android 7.0 - 10)
        int uiOptions = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;

        decorView.setSystemUiVisibility(uiOptions);

        // Auto-reapply sticky flags if the system UI visibility changes unexpectedly
        decorView.setOnSystemUiVisibilityChangeListener(visibility -> {
            if ((visibility & View.SYSTEM_UI_FLAG_FULLSCREEN) == 0) {
                decorView.postDelayed(() -> {
                    decorView.setSystemUiVisibility(uiOptions);
                    if (controller != null) {
                        controller.hide(WindowInsetsCompat.Type.systemBars());
                    }
                }, 400);
            }
        });
    }
}
