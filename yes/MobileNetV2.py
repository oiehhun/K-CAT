import os
import numpy as np
import cv2
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, applications
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split

# 데이터 경로 설정
sfw_path = "/home/k-cat/users/cv-server/data/sfw_img"
nsfw_path = "/home/k-cat/users/cv-server/data/nsfw_img"
img_size = (224, 224)  # 이미지 크기 조정

# 이미지 로드 함수
def load_images_from_folder(folder, label):
    images = []
    labels = []
    for filename in os.listdir(folder):
        if filename.endswith(".jpg"):
            img_path = os.path.join(folder, filename)
            img = cv2.imread(img_path)
            if img is not None:
                img = cv2.resize(img, img_size)  # 크기 조정
                img = img / 255.0  # 정규화
                images.append(img)
                labels.append(label)
    return images, labels

# 데이터 불러오기
sfw_images, sfw_labels = load_images_from_folder(sfw_path, 0)
nsfw_images, nsfw_labels = load_images_from_folder(nsfw_path, 1)

# 리스트 병합
images = np.array(sfw_images + nsfw_images)
labels = np.array(sfw_labels + nsfw_labels)

# 데이터 셔플링
indices = np.arange(images.shape[0])
np.random.shuffle(indices)
images, labels = images[indices], labels[indices]

# 1️⃣ Train/Validation/Test 데이터 나누기
x_train, x_temp, y_train, y_temp = train_test_split(images, labels, test_size=0.3, random_state=42)
x_val, x_test, y_val, y_test = train_test_split(x_temp, y_temp, test_size=0.5, random_state=42)

# 2️⃣ Pretrained 모델 불러오기 (MobileNetV2 사용)
base_model = applications.MobileNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
base_model.trainable = False  # Feature extraction을 위해 가중치 고정

# 3️⃣ 모델 구성
model = keras.Sequential([
    base_model,
    layers.GlobalAveragePooling2D(),
    layers.Dropout(0.5),  # 50% 확률로 뉴런 비활성화
    layers.Dense(128, activation='relu'),
    layers.Dropout(0.5),  # 추가 Dropout
    layers.Dense(1, activation='sigmoid')
])

# 4️⃣ 모델 컴파일
model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

# 5️⃣ 모델 학습 (검증 데이터 포함)
history = model.fit(x_train, y_train, epochs=10, batch_size=32, validation_data=(x_val, y_val))

# 6️⃣ 최종 테스트 데이터 평가
test_loss, test_accuracy = model.evaluate(x_test, y_test, batch_size=32)
print(f"Test Accuracy: {test_accuracy:.4f}")

# 7️⃣ 학습 결과 시각화
plt.plot(history.history['accuracy'], label='Train Accuracy')
plt.plot(history.history['val_accuracy'], label='Validation Accuracy')
plt.xlabel('Epoch')
plt.ylabel('Accuracy')
plt.legend()
plt.show()

# 8️⃣ 예측 함수
def predict_image(image_path):
    img = cv2.imread(image_path)
    img = cv2.resize(img, img_size)
    img = img / 255.0
    img = np.expand_dims(img, axis=0)
    prediction = model.predict(img)
    return "NSFW" if prediction[0][0] > 0.5 else "SFW"

# 9️⃣ 새로운 이미지 테스트
if __name__ == "__main__":
    test_image_path = "/home/k-cat/users/cv-server/data/crop.jpg"
    result = predict_image(test_image_path)
    print(f"Prediction: {result}")