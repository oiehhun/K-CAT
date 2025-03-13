package com.example.catch_v1;

import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import org.bson.Document;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;

public class LoginActivity extends AppCompatActivity {
    private EditText inputPhone;
    private Button btnNext;

    private static final String MONGO_URI = "mongodb+srv://<USERNAME>:<PASSWORD>@cluster0.mongodb.net/?retryWrites=true&w=majority";
    private static final String DATABASE_NAME = "CatchiDB";
    private static final String COLLECTION_NAME = "Users";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        inputPhone = findViewById(R.id.input_phone);
        ImageButton btnNext = findViewById(R.id.btn_next);
        btnNext.setEnabled(false);

        // 전화번호 입력 시 버튼 활성화
        inputPhone.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                // 전화번호 형식 확인 (간단한 예시: 010으로 시작하는 10~11자리 숫자)
                if (s.toString().matches("^010[0-9]{7,8}$")) {
                    btnNext.setEnabled(true); // 활성화
                } else {
                    btnNext.setEnabled(false); // 비활성화
                }
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        btnNext.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String phoneNumber = inputPhone.getText().toString().trim();
                savePhoneNumberToMongoDB(phoneNumber);
            }
        });
    }

    private void savePhoneNumberToMongoDB(String phoneNumber) {
        new Thread(() -> {
            try (MongoClient mongoClient = MongoClients.create(MONGO_URI)) {
                MongoDatabase database = mongoClient.getDatabase(DATABASE_NAME);
                MongoCollection<Document> collection = database.getCollection(COLLECTION_NAME);

                Document existingUser = collection.find(new Document("phone", phoneNumber)).first();
                if (existingUser == null) {
                    Document user = new Document("phone", phoneNumber)
                            .append("role", "pending");
                    collection.insertOne(user);
                }

                runOnUiThread(() -> {
                    Intent intent = new Intent(LoginActivity.this, SelectRoleActivity.class);
                    intent.putExtra("phone", phoneNumber);
                    startActivity(intent);
                    finish();
                });

            } catch (Exception e) {
                e.printStackTrace();
                runOnUiThread(() -> Toast.makeText(LoginActivity.this, "회원가입에 문제가 있습니다.", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }
}
