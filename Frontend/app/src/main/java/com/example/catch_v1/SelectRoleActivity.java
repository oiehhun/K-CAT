package com.example.catch_v1;

import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import org.bson.Document;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;

public class SelectRoleActivity extends AppCompatActivity {

    private ImageView imgParent, imgChild;
    private ImageButton btnSignIn;
    private String selectedRole = null;
    private String phoneNumber;

    // MongoDB 연결 정보
    private static final String MONGO_URI = "mongodb+srv://<USERNAME>:<PASSWORD>@cluster0.mongodb.net/?retryWrites=true&w=majority";
    private static final String DATABASE_NAME = "CatchiDB";
    private static final String COLLECTION_NAME = "Users";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_selectrole);

        // 이전 화면에서 전화번호 받아오기
        phoneNumber = getIntent().getStringExtra("phone");

        imgParent = findViewById(R.id.img_parent);
        imgChild = findViewById(R.id.img_child);
        btnSignIn = findViewById(R.id.btn_signin);

        // 초기 버튼 비활성화 (회색)
        btnSignIn.setEnabled(false);
        btnSignIn.setColorFilter(Color.GRAY);

        // 부모 선택 이벤트
        imgParent.setOnClickListener(v -> {
            selectedRole = "parents";
            activateButton();
        });

        // 자녀 선택 이벤트
        imgChild.setOnClickListener(v -> {
            selectedRole = "child";
            activateButton();
        });

        // 버튼 클릭 시 MongoDB에 저장 후 해당 페이지로 이동 + SharedPreferences 저장
        btnSignIn.setOnClickListener(v -> {
            if (selectedRole != null) {
                saveUserRoleToMongoDB(phoneNumber, selectedRole);
            } else {
                Toast.makeText(SelectRoleActivity.this, "부모 또는 자녀를 선택해주세요.", Toast.LENGTH_SHORT).show();
            }
        });
    }

    // 버튼 활성화 (보라색으로 변경)
    private void activateButton() {
        btnSignIn.setEnabled(true);
        btnSignIn.clearColorFilter();
    }

    // MongoDB + SharedPreferences에 역할 저장 후 화면 이동
    private void saveUserRoleToMongoDB(String phone, String role) {
        new Thread(() -> {
            try (MongoClient mongoClient = MongoClients.create(MONGO_URI)) {
                MongoDatabase database = mongoClient.getDatabase(DATABASE_NAME);
                MongoCollection<Document> collection = database.getCollection(COLLECTION_NAME);

                // 해당 전화번호의 역할 업데이트
                Document query = new Document("phone", phone);
                Document update = new Document("$set", new Document("role", role));
                collection.updateOne(query, update);

                // SharedPreferences에 역할 저장 (앱 종료 후에도 유지됨)
                SharedPreferences preferences = getSharedPreferences("user_prefs", MODE_PRIVATE);
                SharedPreferences.Editor editor = preferences.edit();
                editor.putString("user_role", role);
                editor.putString("phone_number", phone);
                editor.apply();

                // UI 스레드에서 화면 전환
                runOnUiThread(() -> {
                    Intent intent;
                    if (role.equals("parents")) {
                        intent = new Intent(SelectRoleActivity.this, ParentsActivity.class);
                    } else {
                        intent = new Intent(SelectRoleActivity.this, ChildActivity.class);
                    }
                    intent.putExtra("phone", phone);
                    startActivity(intent);
                    finish();
                });

            } catch (Exception e) {
                e.printStackTrace();
                runOnUiThread(() -> Toast.makeText(SelectRoleActivity.this, "DB 저장 실패", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }
}
