| field | selector | mode | what | value | ok |
|---|---|---|---|---|---|
| promptUrl #u | `.modal #u` | light | first character is painted left of the last ("https://hadar.example.com/event/12/") | dir=ltr · first x=417.0 last x=657.0 dx=240.0 | ✅ |
| promptUrl #u (before) | `.modal #u[dir=rtl]` | light | the shipped shape — no `dir`, so the page's rtl — paints the value backwards | first x=549.0 last x=542.0 dx=-7.0 | ✅ |
| editDevice #h | `.modal #h` | light | first character is painted left of the last ("https://hadar.example.com/event/12/") | dir=ltr · first x=417.0 last x=657.0 dx=240.0 | ✅ |
| editDevice #disp | `.modal #disp` | light | first character is painted left of the last ("https://hadar.example.com/event/12/") | dir=ltr · first x=417.0 last x=657.0 dx=240.0 | ✅ |
| control | `.modal #h[dir=rtl]` | light | dropping `dir="ltr"` reverses the painted order (this row proves the check can fail) | first x=549.0 last x=542.0 dx=-7.0 | ✅ |
| exitCode #ex-val | `.modal #ex-val` | light | first character is painted left of the last ("keter7291") | dir=ltr · first x=416.0 last x=474.5 dx=58.5 | ✅ |
| links #l-url | `#l-url` | light | first character is painted left of the last ("https://hadar.example.com/event/12/") | dir=ltr · first x=278.0 last x=518.0 dx=240.0 | ✅ |
| clients #c-code | `#c-code` | light | first character is painted left of the last ("1234") | dir=ltr · first x=277.5 last x=301.5 dx=24.0 | ✅ |
| clients #c-url | `#c-url` | light | first character is painted left of the last ("https://hadar.example.com/event/12/") | dir=ltr · first x=278.0 last x=518.0 dx=240.0 | ✅ |
| enroll #e-url | `#e-url` | light | first character is painted left of the last ("https://hadar.example.com/event/12/") | dir=ltr · first x=318.0 last x=558.0 dx=240.0 | ✅ |
| promptUrl #u | `.modal #u` | dark | first character is painted left of the last ("https://hadar.example.com/event/12/") | dir=ltr · first x=417.0 last x=657.0 dx=240.0 | ✅ |
| promptUrl #u (before) | `.modal #u[dir=rtl]` | dark | the shipped shape — no `dir`, so the page's rtl — paints the value backwards | first x=549.0 last x=542.0 dx=-7.0 | ✅ |
| editDevice #h | `.modal #h` | dark | first character is painted left of the last ("https://hadar.example.com/event/12/") | dir=ltr · first x=417.0 last x=657.0 dx=240.0 | ✅ |
| editDevice #disp | `.modal #disp` | dark | first character is painted left of the last ("https://hadar.example.com/event/12/") | dir=ltr · first x=417.0 last x=657.0 dx=240.0 | ✅ |
| control | `.modal #h[dir=rtl]` | dark | dropping `dir="ltr"` reverses the painted order (this row proves the check can fail) | first x=549.0 last x=542.0 dx=-7.0 | ✅ |
| exitCode #ex-val | `.modal #ex-val` | dark | first character is painted left of the last ("keter7291") | dir=ltr · first x=416.0 last x=474.5 dx=58.5 | ✅ |
| links #l-url | `#l-url` | dark | first character is painted left of the last ("https://hadar.example.com/event/12/") | dir=ltr · first x=278.0 last x=518.0 dx=240.0 | ✅ |
| clients #c-code | `#c-code` | dark | first character is painted left of the last ("1234") | dir=ltr · first x=277.5 last x=301.5 dx=24.0 | ✅ |
| clients #c-url | `#c-url` | dark | first character is painted left of the last ("https://hadar.example.com/event/12/") | dir=ltr · first x=278.0 last x=518.0 dx=240.0 | ✅ |
| enroll #e-url | `#e-url` | dark | first character is painted left of the last ("https://hadar.example.com/event/12/") | dir=ltr · first x=318.0 last x=558.0 dx=240.0 | ✅ |
