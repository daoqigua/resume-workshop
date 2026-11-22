/* 生成语料 D：用 docx 库生成一份典型 Word 简历（.docx），验证 Word 导入链路 */
import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
} from "docx";
import fs from "node:fs";

const P = (text, opts = {}) =>
  new Paragraph({
    children: [new TextRun({ text, size: 22, font: "SimSun", ...opts.run })],
    spacing: { after: opts.after ?? 80 },
    alignment: opts.align,
  });

const doc = new Document({
  sections: [
    {
      children: [
        P("赵小花", { align: AlignmentType.CENTER, run: { bold: true, size: 32 }, after: 120 }),
        P("求职意向：Java 后端开发工程师", { align: AlignmentType.CENTER }),
        P("电话：137-5566-7788    邮箱：zhaoruoxue@example.com    现居：杭州市西湖区", { align: AlignmentType.CENTER, after: 200 }),
        P("教育背景", { run: { bold: true, size: 26 }, after: 100 }),
        P("2019.09-2023.06  杭州电子科技大学  软件工程  本科", 0),
        P("GPA 3.6/4.0，连续三年获校一等奖学金", 0),
        P("实习经历", { run: { bold: true, size: 26 }, after: 100 }),
        P("2022.06-2022.12  某网络科技有限公司  Java 开发实习生", 0),
        P("• 参与订单中心微服务开发，编写接口 30+ 个，覆盖订单全生命周期", 0),
        P("• 优化慢 SQL 12 条，核心接口平均响应时间从 480ms 降至 120ms", 0),
        P("• 搭建单元测试框架，模块测试覆盖率从 35% 提升至 78%", 0),
        P("项目经历", { run: { bold: true, size: 26 }, after: 100 }),
        P("2022.03-2022.05  校园二手交易平台", 0),
        P("• 独立完成后端全部功能，技术栈 Spring Boot + MyBatis + MySQL，注册用户 500+", 0),
        P("技能特长", { run: { bold: true, size: 26 }, after: 100 }),
        P("Java（熟练）、Spring Boot（熟练）、MySQL（熟练）、Redis（掌握）、Git（熟练）", 0),
        P("自我评价", { run: { bold: true, size: 26 }, after: 100 }),
        P("学习能力强，注重代码质量，具有良好的团队协作与沟通能力。", 0),
      ],
    },
  ],
});

const buf = await Packer.toBuffer(doc);
fs.writeFileSync("tmp/corpus-d.docx", buf);
console.log("saved: tmp/corpus-d.docx", buf.length, "bytes");
