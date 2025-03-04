import torch 
import os
import re
from PIL import Image
from datasets import Dataset, DatasetDict
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from transformers import (
    ViTImageProcessor,
    AutoConfig,
    AutoModelForImageClassification,
    Trainer,
    TrainingArguments
)

import wandb
import warnings
warnings.filterwarnings("ignore")

# wandb
wandb.init(project='grooming', name='vit_finetuning')

# 모델 설정(sfw, nsfw)
config = AutoConfig.from_pretrained(
    "google/vit-base-patch16-224",
    num_labels=2,
    label2id={"sfw": 0, "nsfw": 1}, 
    id2label={0: "sfw", 1: "nsfw"}
)

# 모델 불러오기
model = AutoModelForImageClassification.from_pretrained(
    "google/vit-base-patch16-224",
    config=config,  
    ignore_mismatched_sizes=True
)

processor = ViTImageProcessor.from_pretrained("google/vit-base-patch16-224")

# 데이터셋 경로 설정
data_path_nsfw = "./AI/data/image_data/nsfw_img"
data_path_sfw = "./AI/data/image_data/sfw_img"

img_path_list = (
    [os.path.join(data_path_nsfw, f) for f in os.listdir(data_path_nsfw)]
    + [os.path.join(data_path_sfw, f) for f in os.listdir(data_path_sfw)]
)
label_list = ([1] * len(os.listdir(data_path_nsfw)) + [0] * len(os.listdir(data_path_sfw)))

dataset_dict = {
    "image": img_path_list,
    "labels": label_list
}

# 이미지 변환 함수
def transform(batch):
    images = [Image.open(img_path).convert("RGB") for img_path in batch["image"]]
    pixel_values = processor(images=images, return_tensors="pt")["pixel_values"]
    batch["pixel_values"] = pixel_values.numpy()
    return batch

# Dataset 변환
dataset = Dataset.from_dict(dataset_dict)
dataset = dataset.map(transform, batched=True)

# train, valid, test 분할 (80% train, 20% test)
train_paths, test_paths, train_labels, test_labels = train_test_split(
    img_path_list, label_list, test_size=0.2, random_state=42
)

# train 데이터를 다시 train과 valid로 분할 (80% train, 20% valid)
train_paths, valid_paths, train_labels, valid_labels = train_test_split(
    train_paths, train_labels, test_size=0.2, random_state=42
)

# train, valid, test 데이터셋 생성
train_dataset = Dataset.from_dict({"image": train_paths, "labels": train_labels})
valid_dataset = Dataset.from_dict({"image": valid_paths, "labels": valid_labels})
test_dataset = Dataset.from_dict({"image": test_paths, "labels": test_labels})

# transform 함수 적용 (batched=True 유지)
train_dataset = train_dataset.map(transform, batched=True, batch_size=8)
valid_dataset = valid_dataset.map(transform, batched=True, batch_size=8)
test_dataset = test_dataset.map(transform, batched=True, batch_size=8)

# DatasetDict로 결합 (train, valid, test)
dataset_split = DatasetDict({
    "train": train_dataset,
    "validation": valid_dataset,
    "test": test_dataset
})

# 학습 하이퍼파라미터 설정
training_args = TrainingArguments(
    output_dir="./AI/models/vit-finetuned",  
    evaluation_strategy="epoch",
    save_strategy="epoch",
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    num_train_epochs=3,
    learning_rate=5e-5,
    logging_dir="./logs",
    logging_steps=50,  
    save_total_limit=3, 
    load_best_model_at_end=True,
    metric_for_best_model="accuracy",
    greater_is_better=True,
)


# 평가 함수 정의
def compute_metrics(pred):
    labels = pred.label_ids
    preds = pred.predictions.argmax(-1)
    acc = accuracy_score(labels, preds)
    return {"accuracy": acc}

# Trainer 설정
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset_split["train"],
    eval_dataset=dataset_split["validation"],
    tokenizer=processor, 
    compute_metrics=compute_metrics,
)

# 모델 학습
trainer.train()

# 모델 평가
trainer.evaluate(dataset_split["test"])

# 학습 후 최적의 모델 저장
trainer.save_model("./AI/models/vit-finetuned")
processor.save_pretrained("./AI/models/vit-finetuned")
