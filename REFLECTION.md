# Reflection

Replace this working draft with your final answers after the 7-day build. Each answer must be 150-400 words.

## 1. The hardest bug you hit this week, and how you debugged it

Working draft: The first bug I hit was not in the app itself but in extracting the assignment PDF on Windows. The PDF text extraction worked, but PowerShell crashed when it tried to print a bullet character using the default `cp1252` console encoding. My first hypothesis was that the PDF was corrupt or image-based, but the extraction had already counted 12 pages, which meant `pypdf` could read the structure. My second hypothesis was that the failure was happening while printing, not while parsing. I reran the command with `PYTHONIOENCODING=utf-8` and Python’s UTF-8 mode enabled, which confirmed the issue was console encoding. The fix was simple, but the lesson mattered: before changing parsing code, isolate whether the error is in input, transformation, or output. For the final reflection, replace this with the hardest real product bug from the app build.

## 2. A decision you reversed mid-week, and what made you reverse it

Working draft: I initially treated the project as a general lead-generation operations task because the first shared Notion page was inaccessible. After reading the attached Credex PDF, I reversed direction completely: this was not an operations spreadsheet project, it was a product build with a public app, audit logic, backend storage, CI, and launch thinking. I removed the earlier lead-tracker work and shifted to a Next.js app with deterministic audit logic. The reversal was driven by the evaluation rubric: Credex is measuring product judgment, daily shipping, testable code, and founder-style thinking. Continuing with the first interpretation would have optimized for the wrong evaluator and failed the required deliverables.

## 3. What you would build in week 2 if you had it

Working draft: In week 2 I would build benchmark mode and a PDF export. Benchmark mode would compare AI spend per developer against anonymized company-size ranges, because users understand relative waste faster than raw dollar totals. PDF export would make the report easier to forward to finance or a founder without requiring them to open the app. I would also add analytics around recommendation categories so Credex can see whether duplicate tools, plan downgrades, or discounted credits produce the highest-intent leads.

## 4. How you used AI tools

Working draft: I used Codex to read the assignment, scaffold the app, write the first pass of the audit engine, and create evaluator-facing docs. I did not trust AI with pricing facts without checking official pricing pages, and I did not use AI to decide the audit math at runtime because that would make the recommendations harder to defend. One specific AI-adjacent mistake I caught was assuming the original Notion task was the source of truth; once the PDF was provided, I corrected course and aligned to the actual assignment.

## 5. Self-rating

Working draft:

- Discipline: 7/10 - I created the project structure quickly, but the final score depends on real daily commits across the week.
- Code quality: 7/10 - The audit engine is typed and tested, but it still needs production credentials and deployment hardening.
- Design sense: 7/10 - The UI is focused on the audit workflow rather than a generic landing page.
- Problem-solving: 8/10 - I corrected the task direction and separated deterministic math from LLM summary generation.
- Entrepreneurial thinking: 7/10 - The GTM and economics are specific, but the user interviews must be completed with real people.
