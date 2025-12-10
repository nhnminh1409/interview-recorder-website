# generate_tokens.py - CHẠY RIÊNG ĐỂ TẠO TOKEN CHO ỨNG VIÊN
import os
import json
import uuid
import pandas as pd
from datetime import date

# === CÀI ĐẶT Ở ĐÂY ===
EXCEL_FILE = '../data/interviewee.xlsx'        # đổi tên nếu bạn muốn
EXCEL_COLUMN = 'Name'                     # tên cột chứa họ tên
TOKEN_LENGTH = 12                         # độ dài token (10-16 là đẹp)
TOKENS_FILE = '../data/tokens.json'               # file lưu toàn bộ token
OUTPUT_FOLDER = f"Candidates_{date.today()}"   # thư mục sẽ tạo

def generate_tokens():
    if not os.path.exists(EXCEL_FILE):
        print(f"Can not find file: {EXCEL_FILE}")
        print("   → Place candidate file in data folder and retry")
        return

    # Đọc Excel
    try:
        df = pd.read_excel(EXCEL_FILE)
        if EXCEL_COLUMN not in df.columns:
            print(f"Error: Column '{EXCEL_COLUMN}' not found in Excel file")
            print(f"   Exist columns: {list(df.columns)}")
            return
    except Exception as e:
        print(f"Excel file reading error: {e}")
        return

    # Load token cũ (nếu có)
    token_to_name = {}
    if os.path.exists(TOKENS_FILE):
        try:
            with open(TOKENS_FILE, 'r', encoding='utf-8') as f:
                token_to_name = json.load(f)
            print(f"Old token {len(token_to_name)} loaded")
        except:
            token_to_name = {}

    # Tạo token mới cho những người chưa có
    new_candidates = []
    for raw_name in df[EXCEL_COLUMN].dropna():
        name = str(raw_name).strip()
        if not name or name.lower() == 'nan':
            continue
        if name not in token_to_name.values():
            token = uuid.uuid4().hex[:TOKEN_LENGTH].upper()
            token_to_name[token] = name
            new_candidates.append({'Name': name, 'Token': token})

    if not new_candidates:
        print("All candidates have tokens!")
        return

    # Tạo thư mục kết quả
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)

    # Lưu CSV đẹp cho admin
    new_df = pd.DataFrame(new_candidates)
    csv_path = os.path.join(OUTPUT_FOLDER, 'interviewee_tokens.csv')
    new_df.to_csv(csv_path, index=False, encoding='utf-8-sig')

    # Backup tokens.json
    backup_path = os.path.join(OUTPUT_FOLDER, 'tokens_backup.json')
    with open(backup_path, 'w', encoding='utf-8') as f:
        json.dump(token_to_name, f, ensure_ascii=False, indent=2)

    # Cập nhật file tokens.json chính
    with open(TOKENS_FILE, 'w', encoding='utf-8') as f:
        json.dump(token_to_name, f, ensure_ascii=False, indent=2)

    print("\nTOKENS CREATED!")
    print(f"   • Created: {len(new_candidates)} candidates")
    print(f"   • Folder: {OUTPUT_FOLDER}")
    print(f"   • File CSV: {csv_path}")
    print(f"   • Total: {len(token_to_name)} token available\n")

if __name__ == '__main__':
    generate_tokens()
    input("Enter to exit...")