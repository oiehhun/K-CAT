package com.example.catch_v1;

import android.os.Bundle;
import android.os.Handler;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.splashscreen.SplashScreen;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 스플래시 화면 설치
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);

        // 스플래시 화면에 지연을 주기 위해 핸들러를 사용할 수 있습니다.
        new Handler().postDelayed(() -> {
            // 스플래시 화면이 끝난 후 액티비티 전환
            setContentView(R.layout.activity_main);
        }, 1000); //during 1s

    }
}
