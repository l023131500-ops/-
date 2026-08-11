| view | mode | width | group | what | value | ok |
|---|---|---|---|---|---|---|
| client-edit | light | 390px | opened | the dialog is on screen (.modal #k-hl .hl-tag, .modal #k-hl input) | yes | ✅ |
| client-edit | light | 390px | C one run | span.hl-host hadar ⟨.⟩ example | dir=ltr dx=42.9 · hadar.example.com | ✅ |
| client-edit | light | 390px | C one run | span.hl-host example ⟨.⟩ com | dir=ltr dx=57.2 · hadar.example.com | ✅ |
| client-edit | light | 390px | C one run | code example ⟨.⟩ com | dir=ltr dx=52.8 · example.com | ✅ |
| client-edit | light | 390px | C one run | code pay ⟨.⟩ example | dir=ltr dx=26.4 · pay.example.com | ✅ |
| client-edit | light | 390px | C one run | code example ⟨.⟩ com | dir=ltr dx=52.8 · pay.example.com | ✅ |
| client-edit | light | 390px | census | token pairs graded on this view | A 0 · B 0 · C 5 | ✅ |
| client-delete | light | 390px | opened | the dialog is on screen (.modal #y) | yes | ✅ |
| client-delete | light | 390px | census | token pairs graded on this view | A 0 · B 0 · C 0 | ✅ |
| admin-screen | light | 390px | stub | the admin stub reports role=admin and unhides #menu-admin | role=admin menu-admin.hidden=false | ✅ |
| admin-screen | light | 390px | census | token pairs graded on this view | A 0 · B 0 · C 0 | ✅ |
| admin-screen | light | 390px | reflow | the console itself does not scroll sideways (1.4.10) | main 390px in 390px | ✅ |
| admin-screen | light | 390px | reflow | the table that does not fit is inside a scroll container of its own | table 455px in 276px, wrapped=true | ✅ |
| admin-screen | light | 390px | reflow | every button in a user row still comes into view when focused | ערוך painted -99 → [57..107] · סיסמה painted 44 → [57..120] · מחק painted 70 → [70..120] · win=390 | ✅ |
| admin-screen | light | 390px | control (reflow) | unwrapped, main overflows again and מחק is painted off screen until the whole console is dragged (proves the check can fail) | main 512/390 · מחק painted -99 → 0 after main.scrollLeft=-99 · doc=390/390 | ✅ |
| user-edit | light | 390px | opened | the dialog is on screen (.modal #u-active) | yes | ✅ |
| user-edit | light | 390px | census | token pairs graded on this view | A 0 · B 0 · C 0 | ✅ |
| user-new | light | 390px | opened | the dialog is on screen (.modal #u-user) | yes | ✅ |
| user-new | light | 390px | census | token pairs graded on this view | A 0 · B 0 · C 0 | ✅ |
| reset-password | light | 390px | opened | the dialog is on screen (.modal #pw) | yes | ✅ |
| reset-password | light | 390px | census | token pairs graded on this view | A 0 · B 0 · C 0 | ✅ |
| delete-user | light | 390px | opened | the dialog is on screen (.modal #y) | yes | ✅ |
| delete-user | light | 390px | census | token pairs graded on this view | A 0 · B 0 · C 0 | ✅ |
| reset-password | light | 390px | control (C) | the known-bad date+time line is flagged inside a .modal | C: 11 ⟨.⟩ 8 dx=20.7 | C: 8 ⟨.⟩ 2026 dx=12.1 | C: 2026 ⟨,␠⟩ 4 dx=-90.7 | C: 4 ⟨:⟩ 40 dx=12.1 | C: 40 ⟨:⟩ 00 dx=20.7 | ✅ |
| admin-screen | light | 390px | control (C, L…L) | a hyphenated Latin username is emitted in C and increases | C: hadar ⟨-⟩ halls dx=46.7 | ✅ |
| admin-screen | light | 390px | control (A) | a Hebrew-separated pair is emitted as group A and paints right-to-left | 3 ⟨␠מתוך␠⟩ 10 dx=-61.7 | ✅ |
| admin-screen | light | 390px | control (A) | and overriding the direction flags it (this row proves group A can fail) | 3 ⟨␠מתוך␠⟩ 10 dx=53.0 | ✅ |
| client-edit | light | 1200px | opened | the dialog is on screen (.modal #k-hl .hl-tag, .modal #k-hl input) | yes | ✅ |
| client-edit | light | 1200px | C one run | span.hl-host hadar ⟨.⟩ example | dir=ltr dx=42.9 · hadar.example.com | ✅ |
| client-edit | light | 1200px | C one run | span.hl-host example ⟨.⟩ com | dir=ltr dx=57.2 · hadar.example.com | ✅ |
| client-edit | light | 1200px | C one run | code example ⟨.⟩ com | dir=ltr dx=52.8 · example.com | ✅ |
| client-edit | light | 1200px | C one run | code pay ⟨.⟩ example | dir=ltr dx=26.4 · pay.example.com | ✅ |
| client-edit | light | 1200px | C one run | code example ⟨.⟩ com | dir=ltr dx=52.8 · pay.example.com | ✅ |
| client-edit | light | 1200px | census | token pairs graded on this view | A 0 · B 0 · C 5 | ✅ |
| client-delete | light | 1200px | opened | the dialog is on screen (.modal #y) | yes | ✅ |
| client-delete | light | 1200px | census | token pairs graded on this view | A 0 · B 0 · C 0 | ✅ |
| admin-screen | light | 1200px | stub | the admin stub reports role=admin and unhides #menu-admin | role=admin menu-admin.hidden=false | ✅ |
| admin-screen | light | 1200px | C one run | b hadar ⟨-⟩ halls | dir=rtl dx=42.7 · hadar-halls | ✅ |
| admin-screen | light | 1200px | census | token pairs graded on this view | A 0 · B 0 · C 1 | ✅ |
| admin-screen | light | 1200px | reflow | the console itself does not scroll sideways (1.4.10) | main 950px in 950px | ✅ |
| admin-screen | light | 1200px | reflow | the table that does not fit is inside a scroll container of its own | table 836px in 836px, wrapped=true | ✅ |
| admin-screen | light | 1200px | reflow | every button in a user row still comes into view when focused | ערוך painted 249 → [249..299] · סיסמה painted 182 → [182..246] · מחק painted 128 → [128..178] · win=1200 | ✅ |
| admin-screen | light | 1200px | control (reflow) | at 1200px the table fits, so unwrapping changes nothing — recorded, not asserted | main 950/950 · מחק painted 128 → 128 after main.scrollLeft=0 · doc=1200/1200 | ✅ |
| user-edit | light | 1200px | opened | the dialog is on screen (.modal #u-active) | yes | ✅ |
| user-edit | light | 1200px | census | token pairs graded on this view | A 0 · B 0 · C 0 | ✅ |
| user-new | light | 1200px | opened | the dialog is on screen (.modal #u-user) | yes | ✅ |
| user-new | light | 1200px | census | token pairs graded on this view | A 0 · B 0 · C 0 | ✅ |
| reset-password | light | 1200px | opened | the dialog is on screen (.modal #pw) | yes | ✅ |
| reset-password | light | 1200px | census | token pairs graded on this view | A 0 · B 0 · C 0 | ✅ |
| delete-user | light | 1200px | opened | the dialog is on screen (.modal #y) | yes | ✅ |
| delete-user | light | 1200px | census | token pairs graded on this view | A 0 · B 0 · C 0 | ✅ |
| reset-password | light | 1200px | control (C) | the known-bad date+time line is flagged inside a .modal | C: 11 ⟨.⟩ 8 dx=20.7 | C: 8 ⟨.⟩ 2026 dx=12.1 | C: 2026 ⟨,␠⟩ 4 dx=-90.7 | C: 4 ⟨:⟩ 40 dx=12.1 | C: 40 ⟨:⟩ 00 dx=20.7 | ✅ |
| admin-screen | light | 1200px | control (C, L…L) | a hyphenated Latin username is emitted in C and increases | C: hadar ⟨-⟩ halls dx=46.7 | ✅ |
| admin-screen | light | 1200px | control (A) | a Hebrew-separated pair is emitted as group A and paints right-to-left | 3 ⟨␠מתוך␠⟩ 10 dx=-61.7 | ✅ |
| admin-screen | light | 1200px | control (A) | and overriding the direction flags it (this row proves group A can fail) | 3 ⟨␠מתוך␠⟩ 10 dx=53.0 | ✅ |
| client-edit | dark | 390px | opened | the dialog is on screen (.modal #k-hl .hl-tag, .modal #k-hl input) | yes | ✅ |
| client-edit | dark | 390px | C one run | span.hl-host hadar ⟨.⟩ example | dir=ltr dx=42.9 · hadar.example.com | ✅ |
| client-edit | dark | 390px | C one run | span.hl-host example ⟨.⟩ com | dir=ltr dx=57.2 · hadar.example.com | ✅ |
| client-edit | dark | 390px | C one run | code example ⟨.⟩ com | dir=ltr dx=52.8 · example.com | ✅ |
| client-edit | dark | 390px | C one run | code pay ⟨.⟩ example | dir=ltr dx=26.4 · pay.example.com | ✅ |
| client-edit | dark | 390px | C one run | code example ⟨.⟩ com | dir=ltr dx=52.8 · pay.example.com | ✅ |
| client-edit | dark | 390px | census | token pairs graded on this view | A 0 · B 0 · C 5 | ✅ |
| client-delete | dark | 390px | opened | the dialog is on screen (.modal #y) | yes | ✅ |
| client-delete | dark | 390px | census | token pairs graded on this view | A 0 · B 0 · C 0 | ✅ |
| admin-screen | dark | 390px | stub | the admin stub reports role=admin and unhides #menu-admin | role=admin menu-admin.hidden=false | ✅ |
| admin-screen | dark | 390px | census | token pairs graded on this view | A 0 · B 0 · C 0 | ✅ |
| admin-screen | dark | 390px | reflow | the console itself does not scroll sideways (1.4.10) | main 390px in 390px | ✅ |
| admin-screen | dark | 390px | reflow | the table that does not fit is inside a scroll container of its own | table 455px in 276px, wrapped=true | ✅ |
| admin-screen | dark | 390px | reflow | every button in a user row still comes into view when focused | ערוך painted -99 → [57..107] · סיסמה painted 44 → [57..120] · מחק painted 70 → [70..120] · win=390 | ✅ |
| admin-screen | dark | 390px | control (reflow) | unwrapped, main overflows again and מחק is painted off screen until the whole console is dragged (proves the check can fail) | main 512/390 · מחק painted -99 → 0 after main.scrollLeft=-99 · doc=390/390 | ✅ |
| user-edit | dark | 390px | opened | the dialog is on screen (.modal #u-active) | yes | ✅ |
| user-edit | dark | 390px | census | token pairs graded on this view | A 0 · B 0 · C 0 | ✅ |
| user-new | dark | 390px | opened | the dialog is on screen (.modal #u-user) | yes | ✅ |
| user-new | dark | 390px | census | token pairs graded on this view | A 0 · B 0 · C 0 | ✅ |
| reset-password | dark | 390px | opened | the dialog is on screen (.modal #pw) | yes | ✅ |
| reset-password | dark | 390px | census | token pairs graded on this view | A 0 · B 0 · C 0 | ✅ |
| delete-user | dark | 390px | opened | the dialog is on screen (.modal #y) | yes | ✅ |
| delete-user | dark | 390px | census | token pairs graded on this view | A 0 · B 0 · C 0 | ✅ |
| reset-password | dark | 390px | control (C) | the known-bad date+time line is flagged inside a .modal | C: 11 ⟨.⟩ 8 dx=20.7 | C: 8 ⟨.⟩ 2026 dx=12.1 | C: 2026 ⟨,␠⟩ 4 dx=-90.7 | C: 4 ⟨:⟩ 40 dx=12.1 | C: 40 ⟨:⟩ 00 dx=20.7 | ✅ |
| admin-screen | dark | 390px | control (C, L…L) | a hyphenated Latin username is emitted in C and increases | C: hadar ⟨-⟩ halls dx=46.7 | ✅ |
| admin-screen | dark | 390px | control (A) | a Hebrew-separated pair is emitted as group A and paints right-to-left | 3 ⟨␠מתוך␠⟩ 10 dx=-61.7 | ✅ |
| admin-screen | dark | 390px | control (A) | and overriding the direction flags it (this row proves group A can fail) | 3 ⟨␠מתוך␠⟩ 10 dx=53.0 | ✅ |
| client-edit | dark | 1200px | opened | the dialog is on screen (.modal #k-hl .hl-tag, .modal #k-hl input) | yes | ✅ |
| client-edit | dark | 1200px | C one run | span.hl-host hadar ⟨.⟩ example | dir=ltr dx=42.9 · hadar.example.com | ✅ |
| client-edit | dark | 1200px | C one run | span.hl-host example ⟨.⟩ com | dir=ltr dx=57.2 · hadar.example.com | ✅ |
| client-edit | dark | 1200px | C one run | code example ⟨.⟩ com | dir=ltr dx=52.8 · example.com | ✅ |
| client-edit | dark | 1200px | C one run | code pay ⟨.⟩ example | dir=ltr dx=26.4 · pay.example.com | ✅ |
| client-edit | dark | 1200px | C one run | code example ⟨.⟩ com | dir=ltr dx=52.8 · pay.example.com | ✅ |
| client-edit | dark | 1200px | census | token pairs graded on this view | A 0 · B 0 · C 5 | ✅ |
| client-delete | dark | 1200px | opened | the dialog is on screen (.modal #y) | yes | ✅ |
| client-delete | dark | 1200px | census | token pairs graded on this view | A 0 · B 0 · C 0 | ✅ |
| admin-screen | dark | 1200px | stub | the admin stub reports role=admin and unhides #menu-admin | role=admin menu-admin.hidden=false | ✅ |
| admin-screen | dark | 1200px | C one run | b hadar ⟨-⟩ halls | dir=rtl dx=42.7 · hadar-halls | ✅ |
| admin-screen | dark | 1200px | census | token pairs graded on this view | A 0 · B 0 · C 1 | ✅ |
| admin-screen | dark | 1200px | reflow | the console itself does not scroll sideways (1.4.10) | main 950px in 950px | ✅ |
| admin-screen | dark | 1200px | reflow | the table that does not fit is inside a scroll container of its own | table 836px in 836px, wrapped=true | ✅ |
| admin-screen | dark | 1200px | reflow | every button in a user row still comes into view when focused | ערוך painted 249 → [249..299] · סיסמה painted 182 → [182..246] · מחק painted 128 → [128..178] · win=1200 | ✅ |
| admin-screen | dark | 1200px | control (reflow) | at 1200px the table fits, so unwrapping changes nothing — recorded, not asserted | main 950/950 · מחק painted 128 → 128 after main.scrollLeft=0 · doc=1200/1200 | ✅ |
| user-edit | dark | 1200px | opened | the dialog is on screen (.modal #u-active) | yes | ✅ |
| user-edit | dark | 1200px | census | token pairs graded on this view | A 0 · B 0 · C 0 | ✅ |
| user-new | dark | 1200px | opened | the dialog is on screen (.modal #u-user) | yes | ✅ |
| user-new | dark | 1200px | census | token pairs graded on this view | A 0 · B 0 · C 0 | ✅ |
| reset-password | dark | 1200px | opened | the dialog is on screen (.modal #pw) | yes | ✅ |
| reset-password | dark | 1200px | census | token pairs graded on this view | A 0 · B 0 · C 0 | ✅ |
| delete-user | dark | 1200px | opened | the dialog is on screen (.modal #y) | yes | ✅ |
| delete-user | dark | 1200px | census | token pairs graded on this view | A 0 · B 0 · C 0 | ✅ |
| reset-password | dark | 1200px | control (C) | the known-bad date+time line is flagged inside a .modal | C: 11 ⟨.⟩ 8 dx=20.7 | C: 8 ⟨.⟩ 2026 dx=12.1 | C: 2026 ⟨,␠⟩ 4 dx=-90.7 | C: 4 ⟨:⟩ 40 dx=12.1 | C: 40 ⟨:⟩ 00 dx=20.7 | ✅ |
| admin-screen | dark | 1200px | control (C, L…L) | a hyphenated Latin username is emitted in C and increases | C: hadar ⟨-⟩ halls dx=46.7 | ✅ |
| admin-screen | dark | 1200px | control (A) | a Hebrew-separated pair is emitted as group A and paints right-to-left | 3 ⟨␠מתוך␠⟩ 10 dx=-61.7 | ✅ |
| admin-screen | dark | 1200px | control (A) | and overriding the direction flags it (this row proves group A can fail) | 3 ⟨␠מתוך␠⟩ 10 dx=53.0 | ✅ |
| (all) | — | — | stub | the default stub is unchanged (the flag is opt-in) | both stubs stopped; role asserted per-context above | ✅ |
| (all) | — | — | coverage | the probe graded something at all | 22 token pairs across six views | ✅ |
| (all) | — | — | coverage | client-edit carries real pairs (it opened and was walked) | 20 pairs over 4 combinations | ✅ |
| (all) | — | — | coverage | admin-screen carries real pairs (it opened and was walked) | 2 pairs over 4 combinations | ✅ |
| (all) | — | — | coverage | the views themselves populate C (A and B are control-only groups here) | A 0 · B 0 · C 22 | ✅ |
