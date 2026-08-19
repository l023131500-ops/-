# narrow-tables-0811 — the two console tables that never got the scroll wrapper

60/60 rows.

| screen | mode | vp | group | what | value | ok |
|---|---|---|---|---|---|---|
| enroll | light | 390px | opened | הוספת מכשיר — the table is on screen (#e-list table) | yes | ✅ |
| enroll | light | 390px | reflow | main does not overflow (WCAG 1.4.10 — no second scroll axis on the page) | main 390px in 390px · table 548px in box 276px · wrapped=true | ✅ |
| enroll | light | 390px | census | is the table wider than the box it renders into | yes, by 272px | ✅ |
| enroll | light | 390px | method | documentElement.scrollWidth is the wrong read (main.main absorbs the drag) | doc 390px vs window 390px | ✅ |
| enroll | light | 390px | control | the wrapper was found and removed from the DOM (not overflow-x:visible, which computes back to auto) | removed | ✅ |
| enroll | light | 390px | control | without the wrapper main DOES overflow — the check would have caught it | main 610px in 390px | ✅ |
| links | light | 390px | opened | ספריית קישורים — the table is on screen (#l-list table) | yes | ✅ |
| links | light | 390px | reflow | main does not overflow (WCAG 1.4.10 — no second scroll axis on the page) | main 390px in 390px · table 408px in box 276px · wrapped=true | ✅ |
| links | light | 390px | census | is the table wider than the box it renders into | yes, by 132px | ✅ |
| links | light | 390px | method | documentElement.scrollWidth is the wrong read (main.main absorbs the drag) | doc 390px vs window 390px | ✅ |
| links | light | 390px | control | the wrapper was found and removed from the DOM (not overflow-x:visible, which computes back to auto) | removed | ✅ |
| links | light | 390px | control | without the wrapper main DOES overflow — the check would have caught it | main 465px in 390px | ✅ |
| clients | light | 390px | opened | מזהי לקוח (נקבע ב-clients-console-0811) — the table is on screen (#c-list table) | yes | ✅ |
| clients | light | 390px | reflow | main does not overflow (WCAG 1.4.10 — no second scroll axis on the page) | main 390px in 390px · table 679px in box 276px · wrapped=true | ✅ |
| clients | light | 390px | census | is the table wider than the box it renders into | yes, by 403px | ✅ |
| clients | light | 390px | method | documentElement.scrollWidth is the wrong read (main.main absorbs the drag) | doc 390px vs window 390px | ✅ |
| clients | light | 390px | control | the wrapper was found and removed from the DOM (not overflow-x:visible, which computes back to auto) | removed | ✅ |
| clients | light | 390px | control | without the wrapper main DOES overflow — the check would have caught it | main 736px in 390px | ✅ |
| enroll | light | 1200px | opened | הוספת מכשיר — the table is on screen (#e-list table) | yes | ✅ |
| enroll | light | 1200px | reflow | main does not overflow (WCAG 1.4.10 — no second scroll axis on the page) | main 950px in 950px · table 594px in box 594px · wrapped=true | ✅ |
| enroll | light | 1200px | census | is the table wider than the box it renders into | no — fits | ✅ |
| enroll | light | 1200px | method | documentElement.scrollWidth is the wrong read (main.main absorbs the drag) | doc 1200px vs window 1200px | ✅ |
| links | light | 1200px | opened | ספריית קישורים — the table is on screen (#l-list table) | yes | ✅ |
| links | light | 1200px | reflow | main does not overflow (WCAG 1.4.10 — no second scroll axis on the page) | main 950px in 950px · table 634px in box 634px · wrapped=true | ✅ |
| links | light | 1200px | census | is the table wider than the box it renders into | no — fits | ✅ |
| links | light | 1200px | method | documentElement.scrollWidth is the wrong read (main.main absorbs the drag) | doc 1200px vs window 1200px | ✅ |
| clients | light | 1200px | opened | מזהי לקוח (נקבע ב-clients-console-0811) — the table is on screen (#c-list table) | yes | ✅ |
| clients | light | 1200px | reflow | main does not overflow (WCAG 1.4.10 — no second scroll axis on the page) | main 950px in 950px · table 836px in box 836px · wrapped=true | ✅ |
| clients | light | 1200px | census | is the table wider than the box it renders into | no — fits | ✅ |
| clients | light | 1200px | method | documentElement.scrollWidth is the wrong read (main.main absorbs the drag) | doc 1200px vs window 1200px | ✅ |
| enroll | dark | 390px | opened | הוספת מכשיר — the table is on screen (#e-list table) | yes | ✅ |
| enroll | dark | 390px | reflow | main does not overflow (WCAG 1.4.10 — no second scroll axis on the page) | main 390px in 390px · table 548px in box 276px · wrapped=true | ✅ |
| enroll | dark | 390px | census | is the table wider than the box it renders into | yes, by 272px | ✅ |
| enroll | dark | 390px | method | documentElement.scrollWidth is the wrong read (main.main absorbs the drag) | doc 390px vs window 390px | ✅ |
| enroll | dark | 390px | control | the wrapper was found and removed from the DOM (not overflow-x:visible, which computes back to auto) | removed | ✅ |
| enroll | dark | 390px | control | without the wrapper main DOES overflow — the check would have caught it | main 610px in 390px | ✅ |
| links | dark | 390px | opened | ספריית קישורים — the table is on screen (#l-list table) | yes | ✅ |
| links | dark | 390px | reflow | main does not overflow (WCAG 1.4.10 — no second scroll axis on the page) | main 390px in 390px · table 408px in box 276px · wrapped=true | ✅ |
| links | dark | 390px | census | is the table wider than the box it renders into | yes, by 132px | ✅ |
| links | dark | 390px | method | documentElement.scrollWidth is the wrong read (main.main absorbs the drag) | doc 390px vs window 390px | ✅ |
| links | dark | 390px | control | the wrapper was found and removed from the DOM (not overflow-x:visible, which computes back to auto) | removed | ✅ |
| links | dark | 390px | control | without the wrapper main DOES overflow — the check would have caught it | main 465px in 390px | ✅ |
| clients | dark | 390px | opened | מזהי לקוח (נקבע ב-clients-console-0811) — the table is on screen (#c-list table) | yes | ✅ |
| clients | dark | 390px | reflow | main does not overflow (WCAG 1.4.10 — no second scroll axis on the page) | main 390px in 390px · table 679px in box 276px · wrapped=true | ✅ |
| clients | dark | 390px | census | is the table wider than the box it renders into | yes, by 403px | ✅ |
| clients | dark | 390px | method | documentElement.scrollWidth is the wrong read (main.main absorbs the drag) | doc 390px vs window 390px | ✅ |
| clients | dark | 390px | control | the wrapper was found and removed from the DOM (not overflow-x:visible, which computes back to auto) | removed | ✅ |
| clients | dark | 390px | control | without the wrapper main DOES overflow — the check would have caught it | main 736px in 390px | ✅ |
| enroll | dark | 1200px | opened | הוספת מכשיר — the table is on screen (#e-list table) | yes | ✅ |
| enroll | dark | 1200px | reflow | main does not overflow (WCAG 1.4.10 — no second scroll axis on the page) | main 950px in 950px · table 594px in box 594px · wrapped=true | ✅ |
| enroll | dark | 1200px | census | is the table wider than the box it renders into | no — fits | ✅ |
| enroll | dark | 1200px | method | documentElement.scrollWidth is the wrong read (main.main absorbs the drag) | doc 1200px vs window 1200px | ✅ |
| links | dark | 1200px | opened | ספריית קישורים — the table is on screen (#l-list table) | yes | ✅ |
| links | dark | 1200px | reflow | main does not overflow (WCAG 1.4.10 — no second scroll axis on the page) | main 950px in 950px · table 634px in box 634px · wrapped=true | ✅ |
| links | dark | 1200px | census | is the table wider than the box it renders into | no — fits | ✅ |
| links | dark | 1200px | method | documentElement.scrollWidth is the wrong read (main.main absorbs the drag) | doc 1200px vs window 1200px | ✅ |
| clients | dark | 1200px | opened | מזהי לקוח (נקבע ב-clients-console-0811) — the table is on screen (#c-list table) | yes | ✅ |
| clients | dark | 1200px | reflow | main does not overflow (WCAG 1.4.10 — no second scroll axis on the page) | main 950px in 950px · table 836px in box 836px · wrapped=true | ✅ |
| clients | dark | 1200px | census | is the table wider than the box it renders into | no — fits | ✅ |
| clients | dark | 1200px | method | documentElement.scrollWidth is the wrong read (main.main absorbs the drag) | doc 1200px vs window 1200px | ✅ |
