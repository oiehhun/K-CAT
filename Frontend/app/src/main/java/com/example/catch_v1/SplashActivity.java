package com.example.catch_v1;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;

//역할에 따라 화면 이동 -> 홈화면 되게
public class SplashActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // SharedPreferences에서 저장된 역할 가져오기
        SharedPreferences preferences = getSharedPreferences("user_prefs", MODE_PRIVATE);
        String userRole = preferences.getString("user_role", null);

        if (userRole == null) {
            // 역할이 없으면 로그인 화면으로 이동
            startActivity(new Intent(this, LoginActivity.class));
        } else if (userRole.equals("parent")) {
            startActivity(new Intent(this, ParentsActivity.class));
        } else {
            startActivity(new Intent(this, ChildActivity.class));
        }

        finish();
    }
}
