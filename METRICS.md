# Metrics

The North Star metric is **qualified savings discovered per week**. It fits this product better than DAU because founders will not use an AI spend audit every day. The valuable behavior is completing an audit that finds enough credible savings to justify either a lead capture or a Credex consultation.

Three input metrics drive the North Star. First, audit completion rate: if users abandon the form, the tool is asking too much before proving value. Second, high-savings audit rate: the product needs enough users with more than $500/month in savings to produce qualified Credex leads. Third, report capture rate: after seeing value, users should want the report in their inbox or be willing to share the public URL.

I would instrument the funnel first: page view, first tool added, audit submitted, result rendered, email captured, public URL copied, Credex consultation clicked, and transactional email delivered. I would also log recommendation categories, such as duplicate tools, plan downgrade, or discounted credits, so the team can learn which savings story is resonating.

The pivot trigger is specific: after 300 completed audits, if fewer than 3% produce high-savings leads and fewer than 15% capture email, the product is probably attracting curious low-spend users rather than buyers. The next version should narrow positioning toward engineering teams already spending $1k+/month on API or enterprise AI tools.
