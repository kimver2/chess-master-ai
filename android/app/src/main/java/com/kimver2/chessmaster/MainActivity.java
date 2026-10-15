package com.kimver2.chessmaster;

import android.os.Bundle;
import android.view.View;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        View rootView = findViewById(android.R.id.content);
        if (rootView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(rootView, (view, windowInsets) -> {
                int bottomInset = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars()).bottom;
                view.setPadding(0, 0, 0, bottomInset);
                return windowInsets;
            });
        }
    }
}
