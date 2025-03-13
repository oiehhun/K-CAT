package com.example.catch_v1;

import android.os.Bundle;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;

import org.bson.Document;
import org.bson.conversions.Bson;

import java.util.ArrayList;
import java.util.List;

import static com.mongodb.client.model.Updates.*;

public class ConnectActivity extends AppCompatActivity {

    private EditText childPhoneInput;
    private ImageView addChildBtn;
    private String parentPhone;

    private static final String MONGO_URI = "your_mongo_connection_string";  // ✅ 여기에 MongoDB 연결 URL 입력
    private static final String DATABASE_NAME = "your_database";  // ✅ MongoDB 데이터베이스명
    private static final String COLLECTION_NAME = "users";  // ✅ MongoDB 컬렉션명

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_connect);

        childPhoneInput = findViewById(R.id.connect_phone);
        addChildBtn = findViewById(R.id.btn_add_child);
        parentPhone = getIntent().getStringExtra("parentPhone");  // ✅ 부모 전화번호 받아오기

        // 🔹 "추가" 버튼 클릭 시 자녀 전화번호를 MongoDB에 저장
        addChildBtn.setOnClickListener(v -> {
            String childPhone = childPhoneInput.getText().toString().trim();
            if (!childPhone.isEmpty()) {
                saveChildToDatabase(childPhone);  // ✅ 부모와 자녀 연결 실행
            } else {
                Toast.makeText(this, "전화번호를 입력하세요.", Toast.LENGTH_SHORT).show();
            }
        });
    }

    // 🔹 부모-자녀 연결 로직
    private void saveChildToDatabase(String childPhone) {
        new Thread(() -> {
            try (MongoClient mongoClient = MongoClients.create(MONGO_URI)) {
                MongoDatabase database = mongoClient.getDatabase(DATABASE_NAME);
                MongoCollection<Document> collection = database.getCollection(COLLECTION_NAME);

                // 1️⃣ 부모 데이터에서 "children" 필드에 자녀 전화번호 추가
                Document parentQuery = new Document("phone", parentPhone);
                Document parentData = collection.find(parentQuery).first();

                if (parentData != null) {
                    List<String> childList = (List<String>) parentData.get("children");
                    if (childList == null) {
                        childList = new ArrayList<>();
                    }
                    if (!childList.contains(childPhone)) { // 중복 방지
                        childList.add(childPhone);
                        collection.updateOne(parentQuery, set("children", childList));
                    }
                }

                // 2️⃣ 자녀 데이터에서 "parent" 필드 업데이트
                Document childQuery = new Document("phone", childPhone);
                Document childData = collection.find(childQuery).first();

                if (childData != null) {
                    collection.updateOne(childQuery, set("parent", parentPhone));
                } else {
                    runOnUiThread(() -> Toast.makeText(this, "해당 전화번호로 가입된 자녀가 없습니다.", Toast.LENGTH_SHORT).show());
                    return;
                }


                runOnUiThread(() -> {
                    Toast.makeText(this, "자녀가 성공적으로 연결되었습니다!", Toast.LENGTH_SHORT).show();
                    finish();
                });

            } catch (Exception e) {
                e.printStackTrace();
                runOnUiThread(() -> Toast.makeText(this, "자녀 연결 실패", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }
}
