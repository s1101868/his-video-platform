import sys
import os
import json
from google import genai
sys.stdout.reconfigure(encoding='utf-8')
def main():
    # 1. 取得 API Key
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print(json.dumps({"error": "no_api_key"}), flush=True)
        sys.exit(1)

    client = genai.Client(api_key=api_key)

    # 2. 取得影片標題
    title = sys.argv[1] if len(sys.argv) > 1 else "Untitled Video"

    # 3. 建立生成題目 prompt
    prompt = f"""
你是一個嚴格的 JSON 產生器。
請根據影片標題「{title}」產生 3 題多選題。
規則：
1. 回傳格式必須是 JSON 陣列
2. 不要加入任何說明文字
3. 不要使用 ```json
4. 不要加入註解
5. 只輸出 JSON

格式範例：
[
  {{
    "q": "問題",
    "choices": ["A","B","C","D"],
    "answer": 0
  }}
]
"""

    try:
        # 4. 呼叫 GenAI API，注意模型名稱改成帳號可用的
        response = client.models.generate_content(
            model="gemini-2.5-flash",  # <- 改成你帳號可用模型
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )

        text = response.text.strip()
        parsed = json.loads(text)

        # 5. 成功直接輸出 JSON
        print(json.dumps(parsed, ensure_ascii=False), flush=True)

    except Exception as e:
        # 6. 捕捉錯誤，輸出 JSON 給 Node.js
        print(json.dumps({"error": "genai_error", "detail": str(e)}, ensure_ascii=False), flush=True)
        sys.exit(2)

if __name__ == "__main__":
    main()