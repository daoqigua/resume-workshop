/* 生成语料 C：用 pdfkit（独立排版引擎）模拟「Word/WPS 导出」的典型中文简历 PDF，
   避免只用本平台自产 PDF 验证解析造成过拟合。 */
import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";

const FONT = path.join(
  process.cwd(),
  "node_modules/@expo-google-fonts/noto-sans-sc/400Regular/NotoSansSC_400Regular.ttf",
);
const OUT = path.join(process.cwd(), "tmp/corpus-c.pdf");

const doc = new PDFDocument({ size: "A4", margin: 64, info: { Title: "李华简历" } });
doc.pipe(fs.createWriteStream(OUT));
doc.font(FONT).fontSize(14);

const L = (t, after = 6) => {
  doc.text(t, { lineGap: 4 });
  doc.moveDown(after / 10);
};

L("李华", 2);
L("求职意向：数据分析专员", 0);
L("电话：139-1234-5678    邮箱：lihua@example.com", 0);
L("现居：上海市浦东新区", 4);
L("教育背景", 2);
L("2018.09-2022.06  复旦大学  统计学  本科", 0);
L("主修课程：统计学、机器学习、数据挖掘", 4);
L("实习经历", 2);
L("2021.06-2021.12  某咨询有限公司  数据分析实习生", 0);
L("• 协助完成 3 个零售行业项目的数据清洗，处理数据量 10w+ 条", 0);
L("• 独立搭建周报自动化流程，节省团队每周 8 小时人力", 4);
L("项目经历", 2);
L("2022.03-2022.06  毕业设计：电商用户行为分析系统", 0);
L("• 基于 Python 构建用户行为标签体系，覆盖 20+ 维度", 4);
L("技能特长", 2);
L("SQL（熟练）、Python（掌握）、Excel（熟练）、Tableau（了解）", 4);
L("自我评价", 2);
L("对数据敏感，做事细致，具备良好的沟通能力与抗压能力。", 0);

doc.end();
await new Promise((r) => doc.on("end", r));
console.log("saved:", OUT);
