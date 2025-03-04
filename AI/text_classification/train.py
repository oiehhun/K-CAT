import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_recall_fscore_support, accuracy_score
from sklearn.utils import shuffle

import torch
from datasets import Dataset, DatasetDict
from transformers import AdamW, EarlyStoppingCallback
from transformers import get_linear_schedule_with_warmup
from transformers import TrainingArguments, Trainer
from transformers import BertForSequenceClassification
from kobert_tokenizer import KoBERTTokenizer

import wandb
import warnings
warnings.filterwarnings('ignore')

# wandb
wandb.init(project='grooming', name='kobert_finetuning')

# model load
model_path = 'skt/kobert-base-v1'
# finetuned_model_path = '/home/k-cat/TH/K-CAT/lth/model_save/checkpoint-1548'
tokenizer = KoBERTTokenizer.from_pretrained(model_path)
model = BertForSequenceClassification.from_pretrained(model_path, num_labels=2)

# tokenizer
def tokenize_function(data):
    return tokenizer(
        data['text'],
        add_special_tokens=False,   # 이미 [CLS], [SEP] 추가됨
        max_length=512,             # 문장 최대 길이
        truncation=True,            # 문장이 max_length보다 길면 자름
        padding=True                # 동적 패딩 사용(배치 단위로 패딩 적용)
    )
    
# dataset
train_data = pd.read_csv('../data/text_data/train_data.csv')
valid_data = pd.read_csv('../data/text_data/valid_data.csv')
test_data = pd.read_csv('../data/text_data/test_data.csv')

train_data = shuffle(train_data, random_state=42).reset_index(drop=True)

train_dataset = Dataset.from_pandas(train_data) # pandas DataFrame -> Hugging Face Dataset 형식으로 변환
valid_dataset = Dataset.from_pandas(valid_data)
test_dataset = Dataset.from_pandas(test_data)

datasets = DatasetDict({'train': train_dataset, 'valid': valid_dataset, 'test': test_dataset}) # train, valid, test 데이터셋을 묶어서 저장
tokenized_datasets = datasets.map(tokenize_function, batched=True) # train, vaild, test 데이터셋에 tokenize_function 적용

### Train ###
# 모델 저장 경로 설정
model_save_path = '../app/models'

# 학습 파라미터 설정
training_args = TrainingArguments(
    output_dir=model_save_path,                 # 학습 결과 저장 경로
    report_to='wandb',                          # wandb 사용
    run_name="kobert_run1",                     # wandb run 이름
    num_train_epochs=15,                         # 학습 epoch 설정
    per_device_train_batch_size=32,             # train batch_size 설정
    per_device_eval_batch_size=32,              # test batch_size 설정
    logging_dir=model_save_path+'/logs',        # 학습 log 저장 경로
    logging_steps=100,                          # 학습 log 기록 단위
    save_total_limit=2,                         # 학습 결과 저장 최대 개수
    evaluation_strategy="epoch",                # 매 epoch마다 평가 실행
    save_strategy="epoch",                      # 매 epoch마다 모델 저장
    load_best_model_at_end=True,                # 가장 성능이 좋은 모델을 마지막에 load
)

# 최적화 알고리즘(optimizer) 설정
optimizer = AdamW(model.parameters(), lr=2e-5)

# # 스케줄러(scheduler) 설정
# scheduler = get_linear_schedule_with_warmup(
#     optimizer,
#     num_warmup_steps=0,
#     num_training_steps=len(tokenized_datasets['train']) * training_args.num_train_epochs
# )

# 성능 평가 지표 설정(binary classification)
def compute_metrics(pred):
    labels = pred.label_ids
    preds = pred.predictions.argmax(-1)
    precision, recall, f1, _ = precision_recall_fscore_support(labels, preds, average='binary')
    acc = accuracy_score(labels, preds)
    return {
        'accuracy': acc,
        'f1': f1,
        'precision': precision,
        'recall': recall
    }
    
# Trainer 생성
trainer = Trainer(
    model=model, 
    tokenizer=tokenizer,
    # optimizers=(optimizer, scheduler),
    optimizers=(optimizer, None),
    args=training_args,
    train_dataset=tokenized_datasets['train'],
    eval_dataset=tokenized_datasets['valid'],
    compute_metrics=compute_metrics,
    callbacks=[EarlyStoppingCallback(early_stopping_patience=5)]
)

# 모델 학습
trainer.train()


### Test ###
# 테스트(Test) 데이터셋 평가
print(trainer.evaluate(tokenized_datasets['test']))