package com.example.catch_v1;

import android.content.Intent;
import android.os.Bundle;
import android.widget.ImageButton;
import androidx.appcompat.app.AppCompatActivity;

public class ParentsActivity extends AppCompatActivity {

    private String parentPhone;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_parents);

        ImageButton addChildBtn = findViewById(R.id.btn_add_child);
        parentPhone = getIntent().getStringExtra("parentPhone");


        addChildBtn.setOnClickListener(v -> {
            Intent intent = new Intent(ParentsActivity.this, ConnectActivity.class);
            intent.putExtra("parentPhone", parentPhone);
            startActivity(intent);
        });
    }
}
