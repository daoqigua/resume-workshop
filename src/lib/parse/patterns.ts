/** 解析用正则集中导出（parser 与 AI 兜底共用） */

export const PHONE_RE =
  /(?:1[3-9]\d{9})|(?:\d{3}[- ]\d{4}[- ]\d{4})|(?:\(\d{3}\)\s*\d{4}[- ]\d{4})/;
export const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
export const URL_RE =
  /((?:https?:\/\/)?(?:www\.)?(?:github\.com|gitee\.com|gitlab\.com|blog\.csdn\.net|juejin\.cn|leetcode\.cn)[^\s，,；;]*)/i;
