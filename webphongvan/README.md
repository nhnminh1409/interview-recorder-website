
# INTERVIEWING WEB

# 1. Overview

`web_phong_van` is a website used to provide interviewers with an online interview method and to store interview results.
This project aims to make the interviewing process easier. Candidates can participate in multinational interviews without needing to travel for an in-person interview. For employers, the website helps them save time and manpower during the recruitment process; in addition, the website allows employers to store the interview results of candidates.

## Main Features

- Generate separate tokens for each candidate in the provided list.
- Candidates use the token to verify and participate in the interview.
- Record the candidate’s answering process for each question.
- Limit the preparation time and the answering time.
- Store the results after completion with the candidate’s name and the interview start time.
- Convert the candidate’s speech to text (Only works when the language is English).

## Technologies Used

- Front-end: HTML / CSS / Javascript / JSON
- Back-end: PHP / FFPRESET, whisper AI
- Excel file to provide the candidate list. Python to generate tokens.


# 2. SYSTEM FEATURES (FULL DETAILS)

## 2.1 Video Recording Engine

- Uses MediaRecorder API  
- Supports codecs:  
  - `video/webm;codecs=vp8`  
  - `video/webm;codecs=vp9`  
- Live camera preview  
- Auto fallback when codec is not supported  
- Automatically stops when countdown = 0  
- Saves video as blob, then uploads via Fetch  
- Re-encoding compatibility with ffmpeg (server-side)  

## 2.2 Time Control System

Each question has:  
- **Answer time:** 10s  
- **Break time after question:**  5s  
- **One break for preparation:** 3s
During breaks, it can display:  
  - “Start Recording”  
Countdown includes:  
- Timer display mm:ss  
- Progress bar  

## 2.3 Token Authentication

- Each candidate has a unique token  
- Token checks:  
  1. Existence  
  2. Not expired  
  3. Not used  
- If invalid → redirect to error page  
- Token logs:  
  - CPU visited  
  - Browser info  
  - Device type  

## 2.4 Upload & Storage Module
Upload workflow:  
1. MediaRecorder → Blob  
2. Blob → FormData  
3. Fetch POST → `/api/upload-video`  
4. Backend saves file: `/records/<token>/<question>.webm`  
5. (Optional) ffmpeg remux → mp4  
6. Send webhook/email when all videos are completed  

Upload includes:  
- Maximum size 100MB/video  
- SHA-256 hash checksum  

## 2.5 UI/UX
- Mobile-first  
- Bootstrap 5  
- 2 main buttons:  
  - Start Recording  
  - Stop Recording  

- Question screen:  
  - Title  
  - Description  
  - Countdown  
  - Camera preview  
- Break screen:  
  - Remaining time  
  - Instructions  
  - Skip button


# 3. SYSTEM ARCHITECTURE
```text
┌───────────────────┐
│      Browser       │
│  (Frontend + JS)   │
└───────┬───────────┘
        │ MediaRecorder
        ▼
┌───────────────────┐
│     Upload API     │
│  /api/upload-video │
└───────┬───────────┘
        │ Save video
        ▼
┌───────────────────┐
│    File Storage    │
│ /records/<token>/  │
└───────┬───────────┘
        │ Log DB
        ▼
┌───────────────────┐
│  PostgreSQL DB     │
└───────┬───────────┘
        │ Notify
        ▼
┌───────────────────┐
│ Webhook / Email HR │
└───────────────────┘
```
# 4. Project structure
``` text
webphongvan/
├── interview-recorder/
│   ├── api/                  
│   │   ├── admin-api.php                
│   │   ├── contact.php                  
│   │   ├── session-finish.php           
│   │   ├── session-start.php            
│   │   ├── transcribe.php               
│   │   ├── upload-one.php               
│   │   └── verify-token.php             
│   │
│   ├── assets/               
│   ├── Candidates_YYYY-MM-DD/
│   │   ├── interviewee.tokens        
│   │   └── tokens_backup.json        
│   │
│   ├── ffmpeg/                
│   │
│   ├── js/                   
│   │   ├── recorder.js          
│   │   └── recorder-v3.js      
│   ├── uploads/              
│   ├── whisper/                  
│   │
│   ├── admin.html            
│   ├── index.html            
│   ├── interview.html        
│   ├── token.html            
│   │
│   ├── contact-messages.txt  
│   ├── generate_tokens.py    
│   ├── icon.png              
│   ├── icon1.png             
│   ├── interviewee.xlsx      
│   ├── questions.json        
│   ├── tokens.json           
│   └── RUN.bat               
│
├── .gitattributes            
└── README.md            


```
# 5. INSTALLATION & DEPLOYMENT
## 5.1 Clone project
``` bash
git clone https://github.com/nhnminh1409/web_phong_van
cd web_phong_van

Pip install pandas
```
## 5.2 Local Setup (XAMPP)

This project is designed to run using a local web server via **XAMPP Apache**.

### Steps:
``` sql
1. Install and open **XAMPP Control Panel**  
2. Start the **Apache** service  
3. Copy the entire project folder
4. Get the computer’s local IP address (the machine running XAMPP).
```

You will use this IP to access the interview page from any device on the same network.

---

## 5.3 Token Generator (Python)

Tokens are generated automatically using the **RUN** script.

Run:

```bash
python RUN.py

```
## 5.4. How candidates access the system
After tokens are generated and Apache is running, candidates access the interview by opening:
```perl
http://<your-local-ip>/web_phong_van?token=<generated-token>
```

# 6. DATABASE SCHEMA
``` sql
CREATE TABLE tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL,
    candidate_name VARCHAR(255),
    email VARCHAR(255),
    expires_at TIMESTAMP,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE interview_results (
    id SERIAL PRIMARY KEY,
    token VARCHAR(64) REFERENCES tokens(token),
    question_number INTEGER NOT NULL,
    video_path TEXT NOT NULL,
    duration INTEGER,
    filesize BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    token VARCHAR(64),
    event TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT NOW()
);
```

# 7. API DOCUMENTATION (FULL)
## 7.1 Check token
POST /api/check-token
Request:
``` json
 "token": "abc123" 
```

Response:
``` json

  "valid": true,
  "candidate": "Nguyen Van A",
 

```
## 7.2 Upload video
POST /api/upload-video

FormData:
``` makefile
token: abc123
question: 1
file: <blob>
```

Response:
``` json

"status": "success",
"video_path": "/records/abc123/1.webm"

```
## 7.3 Mark interview complete

POST /api/complete

Response:
``` json
"status": "ok" 
```

## 8. INTERVIEW FLOW DIAGRAM (ASCII)
``` text
[Start] 
   │
   ▼
[Token Login]──invalid──▶[Error Page]
   │valid
   ▼
[Show Question 1]
   │ Start Recording
   ▼
[Countdown Running]
   │ timeout or stop
   ▼
[Upload Video]
   │
   ▼
[Break 1: 5s] → [Break 2: 3s] 
   │
   ▼
[Next Question]
   │
   ▼
[Completed] → Send Email/Webhook → [Thank you]
```
