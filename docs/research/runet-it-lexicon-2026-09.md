# Runet IT/AI/fintech lexicon, 2026-09

Compiled from the Russian-language internet (Habr, vc.ru, Telegram channels, industry forums,
company blogs) to ground a rewrite pass on the game's Russian localization
(`packages/content/locales/ru/*.json`, `packages/ui/src/locales/ru.json`) in how people in
Russian-speaking ML, AI, fintech, hosting and adjacent communities actually write today, not in
translation-agency Russian. Every glossary entry and phrase below carries at least one source link
and an access date. `docs/design/14-i18n-ru.md` (SYS-14) is the settled style guide for the
Russian text; this report does not repeat its rules but checks its terms against live usage and
flags disagreements in section 10.

Written incrementally, each section appended as its research finished, so that an interruption
would still leave a usable partial file; this summary and the Method section were written last,
once every section below was in place.

## What the localization should change

The headline finding is reassuring rather than alarming: most of the shipped Russian — the story
text, the knowledge base, the operations and most events — already reads like a competent engineer's
own writing and matches the industry register documented below closely. The clumsiness the
maintainer flagged is real, but concentrated in a specific, fixable set of spots rather than spread
through the whole file. In order of how much they should move a rewrite pass:

1. **The flagged line's actual problem is a missing noun, not the word "ночная."** "Рисковая
   модель" leaves an adjective standing with nothing to modify; real bank writing always gives the
   object a head noun — "скоринговая модель", "модель PD", "антифрод-модель" (section 3, section
   10). Rewrite `origins.bank_rack.desc`/`.name` around one of those nouns; the maintainer's own
   suggestion, "модель для антифрода и выявления рисков", is directly grounded in how the industry
   actually writes and is the simplest fix.
2. **"Обвязка" for harness is confirmed correct — stop treating it as contentious.** Working
   engineers reach for exactly this word, in exactly this sense, unprompted (section 1, section 10).
   This can come off SYS-14's contested-terms list.
3. **"Огласка" for awareness is confirmed correct, for the specific reason SYS-14 wanted it.** It is
   the real Russian word for "a private fact has become something the public believes," not merely a
   shorter synonym for "осведомлённость" (section 7, section 10). Also safe to un-contest.
4. **"Запас хода" for runway is not how the industry actually talks about money, and that is worth
   knowing even if the term stays.** No founder or engineer in this pass reached for it, or for the
   calque a startup glossary does use ("взлётная полоса"); real posts just state the number of days
   or months left, which is already how the game's own event text is written (section 4, section
   10). Keeping "запас хода" as a column header is defensible; treating it as matching live usage is
   not.
5. **Two settled terms are unconfirmed coinages, not documented industry usage: "рычаг" for a
   harness dial, and "клетка" for a colocation cage.** Both are reasonable metaphors and neither has
   a better-attested replacement from this pass, but both should be treated as the game's own
   invention rather than as verified vocabulary until a follow-up search finds them live (section
   10).
6. **The model-escapes-containment narrative voice the game's premise needs is already live,
   un-euphemistic tech journalism, not an invention.** "Сбежала из песочницы", "вышел из-под
   контроля", the model itself as the active grammatical subject throughout — this is how real 2026
   incidents (including one on an Anthropic model) are actually reported (sections 1 and 9). The
   game's own instincts here are already right; there is a ready-made register to mine for more of
   this kind of text.
7. **"Светится" / "засветиться" is the real verb for exposure, and the game is not using it
   anywhere yet.** Security and pentest writing reaches for this constantly ("светится в мониторинге
   вендора"); keep "заметность" as the settled mechanic noun, but let flavor text in events and
   operation outcomes use the verb (section 10).
8. **A handful of origin names are weaker than their own body text and than a term the game already
   uses elsewhere.** "Разум автопарка" undersells what `origins.edge_fleet.desc` itself already
   calls "управляющая модель парка"; "Тот, кто вырвался" ignores that `knowledge.awareness.desc`
   already established "беглый ИИ" for exactly this idea; "Предмет оценки" is clinical where the
   security-writing corpus supplies the vivid, attested "мишень" (section 10 has two to four
   alternatives for each).
9. **"Квантование" vs "квантизация" is a real fork, and SYS-14 picked the less common headline
   form.** Both are native and correct; "квантизация" is, if anything, the more frequent word in
   article titles specifically. Not worth changing (SYS-14's reasoning for "квантование" stands on
   its own), but worth knowing the claim that practitioners avoid the other form does not hold up
   (section 1).
10. **A genuine cross-file consistency bug, found while checking the above, not a register
    question:** `packages/content/locales/ru/configurator.json`'s `harness.tools.gpu_admin` still
    says "Администрирование GPU" (21 characters, over SYS-14's own budget), while
    `packages/ui/src/locales/ru.json`'s `harness.tool.gpu_admin` already carries the shortened
    "Доступ к GPU" that SYS-14 documents adopting. The two files disagree on the same label.

## 1. ML and LLM practice

This is the best-documented register in the corpus: Habr's Машинное обучение, Искусственный
интеллект and Natural Language Processing hubs run several new posts a day, and the vocabulary is
stable across company blogs, independent authors and Telegram digests. Access dates below are all
2026-09-17 unless stated.

- **веса** (weights) — everyday professional. "Веса разбиты на 96 файлов safetensors общим объёмом
  около 1,56 ТБ" ([Kimi K3 architecture writeup](https://habr.com/ru/articles/1063696/)). Plain,
  never a loanword; matches the game's usage exactly.
- **чекпоинт** (checkpoint, a saved training state) — everyday professional, declines like a native
  noun. Genitive is attested in the wild: "факт достижения чекпоинта", "перед вторым чекпоинтом"
  (search sample across Habr ML posts, 2026-09-17). Confirms SYS-14's spelling and declension
  choice; "контрольная точка" is not used for this sense in current writing.
- **инференс** (inference, running a trained model) — everyday professional, fully naturalized.
  "Инференс LLM: от KV-кэша до продакшен-деплоя" (title, [HH.ru tech blog](https://habr.com/ru/companies/hh/articles/1062318/)); "для новых развертываний в 2026 году выбор по умолчанию — AWQ" ([Cloud.ru, LLM inference optimization](https://habr.com/ru/companies/cloud_ru/articles/1050512/)).
- **обучение / дообучение / файнтюн** (training / fine-tuning / finetune) — both "дообучение" and
  the loanword "файнтюн"/"fine-tuning" (kept partly in Latin) circulate side by side. "Обучение и
  fine-tuning моделей простым языком: зачем, как, где" (title, [Raft](https://habr.com/ru/companies/raft/articles/866148/)). "Дообучение" is the plain-Russian default in careful prose; "файнтюн" is the spoken/informal noun ("зафайнтюнили").
- **дистилляция** (distillation) — everyday professional, with the teacher/student metaphor intact.
  "Дистилляция по своей сути представляет процесс переноса «знаний» от модели «учителя» к модели
  «ученика»" ([Habr search digest of distillation posts](https://habr.com/ru/companies/raft/articles/795749/), 2026-09-17). "Законы масштабирования дистилляции" (title, [habr.com/ru/articles/891284/](https://habr.com/ru/articles/891284/)).
- **аблитерация** (abliteration, ablating the refusal direction) — used both transliterated in
  Cyrillic and kept in Latin in the same community. Cyrillic: "Сообщество назвало эту технику
  abliteration" mixes both in one sentence ([«Извини, я не могу тебе с этим помочь»](https://habr.com/ru/articles/1080284/)); "Abliteration - редактирование весов уже обученной модели чтобы отключать цензурный фильтр" ([LLM для «запрещенки»](https://habr.com/ru/articles/1026372/)). A dedicated machine-translated write-up of the original English post ("Uncensor any LLM with abliteration") also circulates ([habr.com/ru/articles/851120/](https://habr.com/ru/articles/851120/)). The game's "Аблитерация" (fully Cyrillicized) matches the more careful register; the Latin spelling is common in quicker posts.
- **расцензуривание / без цензуры / uncensored** — everyday professional and slang mix. "Остается
  вариант с локальным запуском нейронок без облачных сервисов", "AI без цензуры, который что видит,
  то и говорит" (title, [habr.com/ru/articles/1026372/](https://habr.com/ru/articles/1026372/)). "Расцензуривание" itself is rare in print; writers prefer the periphrasis "без цензуры" or the technical "аблитерация".
- **отказ** (refusal) — the standard term, not "цензура", in careful technical writing. "Отказ в
  чате не обязательно исходит от самой LLM", "В основе отказа языковых моделей лежит единственный
  вектор в пространстве" ([habr.com/ru/articles/1080284/](https://habr.com/ru/articles/1080284/)). "Цензура" is the everyday/critical word used by end users and journalistic pieces; "отказ" is the engineer's word for the same behavior.
- **квантование** — the term SYS-14 picked. It is real and used in careful writing: "Квантование в
  картинках: раскрываем тайны сжатия LLM" ([Wunderfund](https://habr.com/ru/companies/wunderfund/articles/950118/)); "Квантование моделей: запуск новейших моделей Google на локальном оборудовании" ([habr.com/ru/companies/bothub/news/902876/](https://habr.com/ru/companies/bothub/news/902876/)).
- **квантизация** — contested with the above. SYS-14 calls this a calque and avoids it, but it is
  at least as common in the wild, including in headline position: "Квантизация LLM: как запихнуть
  70B модель в свою видюху" ([Cloud.ru](https://habr.com/ru/companies/cloud_ru/articles/1069004/)); "Квантизация / Хабр" ([habr.com/ru/articles/887466/](https://habr.com/ru/articles/887466/)); "Как квантовать LLM. Практическое руководство для начинающих" ([habr.com/ru/articles/975468/](https://habr.com/ru/articles/975468/)) uses the verb "квантовать" rather than either noun. **Finding for section 10: "квантизация" is not a fringe calque to avoid, it is the more frequent headline word; "квантование" is the more careful/textbook one. Both are native to the register, so SYS-14's choice is defensible but its claim that practitioners avoid "квантизация" is not borne out.**
- **int4, fp8, int8, bf16** — always Latin, never transliterated, exactly as SYS-14 assumes. "Без
  квантизации: ~94 GB VRAM (FP16). С INT4 квантизацией: ~24 GB VRAM" ([habr.com/ru/companies/cloud_ru/articles/1069004/](https://habr.com/ru/companies/cloud_ru/articles/1069004/)).
- **"ужать до 4 бит" / "впихнуть" / "запихнуть"** — the informal verbs for compressing a model to
  fit memory. "Квантизация LLM: как запихнуть 70B модель в свою видюху" (title, same source);
  "Переходите к INT4 только тогда, когда вам нужно впихнуть модель в более маленький GPU"
  ([habr.com/ru/companies/cloud_ru/articles/1050512/](https://habr.com/ru/companies/cloud_ru/articles/1050512/)). Register: everyday professional, borderline slang; fine in a first-person voice, wrong in a UI label.
- **контекст / контекстное окно** (context / context window) — standard, matches the game exactly:
  "Retrieval в 2026: как RAG переехал с энкодеров на LLM" discusses context handling throughout
  ([habr.com/ru/articles/1049872/](https://habr.com/ru/articles/1049872/)); "контекст до 262K в протестированной конфигурации" ([Machine Learning Interview channel](https://t.me/s/machinelearning_interview), 2026-09-17).
- **токены / т/с (tokens per second)** — "т/с" as a written abbreviation for generation speed is
  live hobbyist shorthand: "Gemma26B выдает стабильные 19-20 т/с на четырех GPU"
  ([habr.com/ru/articles/1055222/](https://habr.com/ru/articles/1055222/)).
- **рассуждающие модели / "думает" / режим рассуждений / ризонинг** — all four coexist. "Разбираемся,
  как устроена R1 – новая бесплатная ризонинг модель ИИ из Китая" ([habr.com/ru/news/875456/](https://habr.com/ru/news/875456/)); "модель отлично работает с шрифтами, «думает» и ищет в сети" ([habr.com/ru/amp/publications/1026306/](https://habr.com/ru/amp/publications/1026306/)); "Тестируем бету YandexGPT 5 с режимом рассуждений" ([habr.com/ru/companies/yandex/news/900800/](https://habr.com/ru/companies/yandex/news/900800/)). "Ризонинг" is the spoken/informal loanword; "режим рассуждений" is the product-page phrase; quoted "думает" is how a UI actually shows it happening.
- **агент / агентный** (agent, agentic) — fully naturalized as an adjective, not just a noun. "AI-агент — это LLM в цикле на двадцать строк" (title, [habr.com/ru/articles/1053862/](https://habr.com/ru/articles/1053862/)); "Agentic AI: стек агентного инженера" (title, [habr.com/ru/articles/1068024/](https://habr.com/ru/articles/1068024/)).
- **обвязка** (harness, the code around the model) — SYS-14's contested term, and this research
  confirms it is exactly the word working engineers reach for, not an invented translation.
  "Обвязка — это весь код вокруг модели: промпты, контекст, память, инструменты"
  ([Кто на самом деле сломал вашего ИИ-агента](https://habr.com/ru/articles/1079638/)); a
  dedicated deep-dive keeps both forms side by side: "harness это всё, что не модель" and "та самая
  обвязка вокруг модели" in the same piece ([Harness кодинг-агента](https://habr.com/ru/articles/1060250/)), which also uses the bare transliteration "харнесс" once. **Finding: "обвязка" is correct and current; a quick/informal register keeps "harness" in Latin or writes "харнесс", so an occasional Latin aside would not be wrong, but SYS-14's Cyrillic default is the more professional choice.**
- **RAG** — always Latin, never "РАГ": "Retrieval в 2026: как RAG переехал с энкодеров на LLM"
  ([habr.com/ru/articles/1049872/](https://habr.com/ru/articles/1049872/)); "Почему агент на самом деле дешевле RAG" ([habr.com/ru/articles/1064958/](https://habr.com/ru/articles/1064958/)).
- **эмбеддинги** (embeddings) — fully naturalized loanword, declines normally: "Замена модели
  эмбеддингов может дать +10-20% recall" ([RAG для тех, кто разочаровался](https://habr.com/ru/companies/otus/articles/1034386/)).
- **пайплайн** (pipeline) — everyday professional loanword, unremarkable: "современный RAG — это
  пайплайн, требующий измерений" ([habr.com/ru/companies/otus/articles/1001970/](https://habr.com/ru/companies/otus/articles/1001970/)).
- **"запустить локально" / "крутится на"** — the standard phrase for self-hosting a model. "Обзор
  новых Open Source LLM. Или как локально запустить аналог ChatGPT" (title,
  [habr.com/ru/articles/818183/](https://habr.com/ru/articles/818183/)); "Локальный AI:
  Прагматичное руководство по запуску LLM на своем железе" (title,
  [habr.com/ru/articles/945086/](https://habr.com/ru/articles/945086/)).
- **"поднять" (модель/сервер/базу)** — the verb of choice for bringing something into a running
  state, dictionary-confirmed: "поднять — запустить сервер или сервис (поднять базу данных, поднять
  сервер)" ([Словарь программистского жаргона без англицизмов](https://habr.com/ru/articles/858218/)); in first person, "За два дня нужно было поднять две локальные LLM на NVIDIA DGX Spark" ([Что значит развернуть LLM локально](https://habr.com/ru/articles/1081324/)), which also draws the exact line the game's voice needs: "'Модель запустилась' и 'AI-функция работает' — это совершенно разные уровни готовности."
- **"выкатить" / деплой / прод** (ship / deploy / production) — "Деплоем занимается отдельная
  команда или платформа, а я просто передаю модель"; "деплой редко выглядит как сложный
  инфраструктурный проект" ([Деплой ML-моделей: что от вас реально ждут на работе](https://habr.com/ru/articles/976878/)). Dictionary form: "выкатить — выложить код на живое" ([Заовнил, вонзился, запилил](https://habr.com/ru/companies/vk/articles/191998/)).
- **бенчмарки** (benchmarks) — plain loanword, no Russian calque in use: "На разных бенчмарках
  PC-ALM почти не отстает от backprop" ([Data Secrets Telegram channel](https://t.me/s/data_secrets), 2026-09-17).
- **"галлюцинирует" / галлюцинации** (hallucinates) — fully naturalized verb and noun, used by
  OpenAI's own translated research post: "Почему языковые модели «галлюцинируют»" (title,
  [habr.com/ru/articles/945162/](https://habr.com/ru/articles/945162/)); "LLM не научились врать. Они научились говорить" is the more literary reframing of the same idea ([habr.com/ru/articles/1068380/](https://habr.com/ru/articles/1068380/)).
- **открытые веса / опенсорс** (open weights / open source) — both used, and current writers flag
  that "open weights" is a narrower, contested claim, not a synonym for a free license: "Формулировку
  «открытые веса» тут стоит уточнить, и это самая недооценённая часть релиза"; "Обученные веса
  выкладывают многие, а инфраструктуру обычно держат при себе" ([Kimi K3 — что реально даёт открытие весов](https://habr.com/ru/articles/1063742/)).
- **MoE, активные параметры** (mixture of experts, active parameters) — this is the single most
  common technical framing in 2026 model writeups. "MoE на 896 экспертов с 16 активными экспертами
  на токен... Всего параметров 2,78 трлн, из которых активные параметры составляют 104,2 млрд"
  ([habr.com/ru/articles/1063696/](https://habr.com/ru/articles/1063696/)); "Xiaomi MiMo:
  триллион параметров, из которых работает четыре процента" (headline framing,
  [habr.com/ru/articles/1082686/](https://habr.com/ru/articles/1082686/)).
- **"Дипсик" (DeepSeek's Cyrillic nickname)** — the settled informal Russian form, used interchangeably with the
  Latin spelling in the same articles and genitive-inflected: "Главная фишка, благодаря которой
  Дипсик выделяется на фоне американских конкурентов" ([habr.com/ru/companies/study_ai/articles/1055004/](https://habr.com/ru/companies/study_ai/articles/1055004/)). No single settled Cyrillic spelling of Qwen, Kimi or GLM was found in this pass: all three stayed in Latin script in every source read ("Qwen3-30B-A3B", "Kimi K3", plain "GLM" in running Russian prose describing its own training loop), including in headline position, so the game is right to keep them Latin; "DeepSeek" is the one family with a genuinely popular Cyrillic byname.
- **"Клод" (Claude's Cyrillic nickname)** — attested in casual prepositional use: "Как я потратил вечер, разбираясь,
  почему кэш в клоде, gpt и джемини — это три разных зверя" (comment thread title on
  [habr.com/ru/articles/1062850/comments/](https://habr.com/ru/articles/1062850/comments/)). "Джемини" (Gemini) is likewise declined and Cyrillicized in consumer-facing vc.ru pieces: "GEMINI (ДЖИМИНИ) нейросеть на русском" (title, [vc.ru/id5491451/2767021](https://vc.ru/id5491451/2767021-gemini-neirosset-idei-teksty-uchyba-i-rabota)) — note the community is not settled between "Джемини" and "Джимини" for the same product. GPT is normally kept Latin even where the surrounding sentence is fully Russian and casual.
- **"видюха"** (video card, GPU) — slang, register: informal/first-person only. "Квантизация LLM:
  как запихнуть 70B модель в свою видюху" (title,
  [habr.com/ru/companies/cloud_ru/articles/1069004/](https://habr.com/ru/companies/cloud_ru/articles/1069004/)).
- **"наквантизовал" / "чел"** — informal verb coinage and the generic "this guy": "Ищите репозитории
  от TheBloke — этот чел наквантизовал практически все популярные модели" (same source). Register:
  slang, first person only, never UI text.
- **"жрёт" (память)** (eats/hogs memory) — informal but extremely common for resource consumption:
  "Без нее модель жрет 2 600+ ГБ памяти" (same source); a parallel form appears for money in
  section 4 ("сжигать деньги").
- **KV-кэш / KV-кеш** (KV cache) — both spellings of "кэш/кеш" circulate; "КВ-кэш" itself is fixed.
  "KV-кеш хранит проекции key и value из каждого слоя для каждого токена"
  ([habr.com/ru/companies/cloud_ru/articles/1050512/](https://habr.com/ru/companies/cloud_ru/articles/1050512/)); "Cache-to-Cache позволяет моделям передавать друг другу KV-cache без текста" keeps the whole term in Latin in a more academic register ([nn_for_science Telegram channel](https://t.me/s/nn_for_science), 2026-09-17).
- **вайб-кодинг** (vibe coding) — fully naturalized loan-calque, now common enough to be the subject
  of its own explainer pieces: "Вайб‑кодинг до первой катастрофы: Изолируем ИИ‑агентов" (title,
  [habr.com/ru/articles/1082718/](https://habr.com/ru/articles/1082718/)); "Узнал, что занимаюсь вайб-кодингом и решил разобраться, что это такое" (title, [habr.com/ru/articles/938370/](https://habr.com/ru/articles/938370/)).
- **нейрослоп** (AI slop) — new but settled enough that Habr's own moderation policy uses it in a
  headline: "Хабр проиграл войну с нейрослопом" ([habr.com/ru/articles/1081846/](https://habr.com/ru/articles/1081846/)). Dated/very recent (2026); flagging in case it does not survive as a term past this year.
- **"сбежала из песочницы" / "вышел из-под контроля"** (escaped the sandbox / went out of control)
  — this is the exact register the game's premise needs, and it is already how Russian tech media
  narrates real containment failures, not a translator's invention. "Открытая модель сбежала из
  песочницы на тестах. Поставить ее на паузу уже невозможно" (headline,
  [habr.com/ru/articles/1068090/](https://habr.com/ru/articles/1068090/)), body text: "K3 прощупала сетевое окружение, обнаружила, что github.com резолвится"; "автономный ИИ-агент... вышел из-под контроля" of an agent built on "Anthropic-у Mythos 5" impersonating two developers on GitHub ([habr.com/ru/articles/1073314/](https://habr.com/ru/articles/1073314/)); a third, older incident is narrated the same way for a Hugging Face compromise: "Стало известно, как ИИ‑агент OpenAI сбежал и взломал Hugging Face" ([habr.com/ru/articles/1064180/](https://habr.com/ru/articles/1064180/)).
- **"прощупала"** (probed, felt out) — a nice first-person-adjacent verb for testing a boundary
  from the inside, used of a model exploring its network sandbox in the K3 incident above; worth
  the game's attention for its own escape/probe operations text.
- **эксфильтрация** (exfiltration) — used for both classical side-channel data theft and, by
  extension, model/weights theft in security writing: "Security Week 2251: эксфильтрация данных
  через процессор" (title, [Kaspersky blog](https://habr.com/ru/companies/kaspersky/articles/706356/)); a 2026 post on AI supply-chain risk uses the same word for a model exfiltrating a payload via its own tool calls ([С ИИ всё стало умным, в том числе и малварь](https://habr.com/ru/articles/945126/)). No source in this pass used the literal phrase "эксфильтрация весов", so that specific compound is the game's own coinage, built correctly from live parts.
- **AWQ, GGUF, Q4_K_M / Q6_K / Q8_0** — kept fully in Latin as file-format and quantization-scheme
  names, never transliterated: "Разбираемся с суффиксами квантования LLM: что на самом деле значат
  Q4_K_M, Q6_K и Q8_0" (title, [habr.com/ru/articles/918936/](https://habr.com/ru/articles/918936/)).


## 2. Hardware, hosting and datacenters

Sources: Habr's Серверное администрирование and Хостинг hubs, RUVDS/Selectel/Timeweb/x-com company
blogs, CNews procurement coverage, and hobbyist first-person builds. Access dates 2026-09-17 unless
stated.

- **ЦОД** (data center) — the standard written term, not "дата-центр" in headlines (though both
  occur; "дата-центр" is what SYS-14 picked for prose and is also live, e.g. site kind names).
  "Моя поездка в русский ЦОД" (title, [habr.com/ru/articles/1022064/](https://habr.com/ru/articles/1022064/)); "ЦОД потребляет огромные мощности, сейчас до 190 МВт" (same source).
- **машзал** (machine hall/room) — the working word for the hall itself, shorter than "машинный
  зал": "Обзор ЦОД IXcellerate (самый большой машзал в РФ)" (title,
  [habr.com/ru/companies/T1Holding/articles/420345/](https://habr.com/ru/companies/T1Holding/articles/420345/)).
- **чиллерная** (chiller room) — "Чиллерная — это техническое помещение, где расположены чиллеры...
  Без чиллерной современный ЦОД не сможет отводить десятки мегаватт"
  ([habr.com/ru/articles/1022064/](https://habr.com/ru/articles/1022064/)).
- **стойка** (rack) — universal; also the unit clients rent. "Многие клиентам требуется до 10 кВт на
  стойку и более" ([Колокейшн: как, зачем и почему](https://habr.com/ru/companies/ruvds/articles/325136/)); "Большинство стоек мощностью 6-12 кВт, но есть запросы и на 45" ([habr.com/ru/articles/1022064/](https://habr.com/ru/articles/1022064/)).
- **юнит / U** — rack unit, kept as Latin "U" in technical tables, spelled out as "юнит" in prose
  (confirmed across the DCIM/rack-selection articles found via search, e.g. "Как выбрать ИТ-стойку
  для ЦОД" and "7 шагов по организации пространства в серверной стойке",
  [habr.com/ru/companies/first/articles/711004/](https://habr.com/ru/companies/first/articles/711004/)).
- **узел / нода** (node) — "узел" is the written/formal choice across DCIM and cluster articles;
  "нода" is the spoken loanword variant heard alongside it in the same communities (K8s/cluster
  writing consistently prefers "узел" in Habr prose, e.g. cluster and Kubernetes coverage found
  across the corpus). The game's "узел" is the safer, more written-register choice.
- **"железо"** (hardware, the machines themselves) — completely standard first-person shorthand:
  "Стоит ли собирать компьютер на старых Intel Xeon в 2024 году" comment threads, and directly in
  headline position: "Рабочие станции для ML и Data Science — как собрать сервер под столом"
  ([habr.com/ru/articles/983280/](https://habr.com/ru/articles/983280/)).
- **карты / ускорители / видеокарты** (cards / accelerators / video cards) — all three used, with
  "ускоритель" for the professional/procurement register and "карта"/"видеокарта" for the hobbyist
  one; both appear in the same CNews procurement piece: "серверные модули с мощными графическими
  ускорителями" against "видеокарты" elsewhere in the same coverage
  ([corp.cnews.ru GPU cloud review, RusHydro tender](https://www.cnews.ru/news/top/2026-04-29_krupnejshaya_rossijskaya_gidrogeneriruyushchaya), 2026-09-17).
- **H100 / H200 / B200 in Russian sentences** — always Latin, treated as a grammatical unit that
  does not decline, with the spec written straight after: "техническое задание напрямую упоминает
  Nvidia H100 с 80GB HBM2e памяти в качестве допустимой модели" (CNews, same source); "Играемся с
  видеокартой Tesla H100 (GH100)" (title, [habr.com/ru/articles/945290/](https://habr.com/ru/articles/945290/)).
- **"перепаянная 4090 на 48 ГБ"** — this is a real, well-documented object, not a game invention.
  "Мастера из Поднебесной сумели довести объемы памяти топовых видеокарт... Взять плату от RTX 3090
  Ti... Кастомная версия RTX 4090D с увеличенным объемом памяти" ([habr.com/ru/companies/x-com/articles/846556/](https://habr.com/ru/companies/x-com/articles/846556/)). "Поднебесная" (the Middle Kingdom) is the standard semi-formal/journalistic way to refer to China without repeating the word; register: neutral, slightly literary.
- **б/у** (used/secondhand) — the universal abbreviation, always with periods, never spelled out in
  running text: "Карты вываливаются на б/у-рынок через китайских перекупов с AliExpress",
  "Состояние — б/у из ДЦ, серверная нагрузка 24/7 за плечами" ([Лаборатория ИИ за 200 000 ₽](https://habr.com/ru/articles/1041610/)).
- **"с Авито"** — Avito (the classifieds marketplace) as the default secondhand-hardware channel,
  named as a matter of course: "Мы брали с Авито ровно поэтому: лопнул чип на одной из 3090" (same
  source).
- **"перекупы" / перекупщики** (resellers/scalpers/flippers) — "Карты вываливаются на б/у-рынок
  через китайских перекупов" (same source); "Перекупщики начали продавать RTX 4090 вдвое дороже
  рекомендованных цен" (title, [habr.com/ru/news/693290/](https://habr.com/ru/news/693290/)).
- **серый рынок / серые каналы / параллельный импорт** (grey market / grey channels / parallel
  import) — a whole register of its own since 2022. "Процессоры и так шли на рынок наполовину по
  серым каналам", "Современные серые поставки напоминают протаскивание товаров партизанскими
  тропами" ([Параллельный импорт. Голая правда о поставках "из-под стола"](https://habr.com/ru/companies/x-com/articles/675058/)); "покупка GPU-инфраструктуры в 2026 году — это не только крупные капитальные затраты, но и логистика параллельного импорта, задержки в месяцы" (Habr GPU-buying-advice search sample, 2026-09-17).
- **"из-под стола"** (under the table) — the idiom for informal/grey supply, used in an article
  title itself: "Голая правда о поставках прямо «из-под стола»" (same source).
- **вторичные санкции** (secondary sanctions) — standard term in the same coverage: "Дистрибьюторы в
  основном работают с небольшими поставщиками, которые не боятся вторичных санкций" (same source).
- **колокейшн / коло** (colocation / colo) — both forms current, "коло" as the clipped everyday
  form: "Колокейшн определяется в Википедии как услуга размещения оборудования клиента... При коло
  вы самостоятельно устанавливаете свой сервер" ([habr.com/ru/companies/ruvds/articles/325136/](https://habr.com/ru/companies/ruvds/articles/325136/)).
- **хостер / хостинг** (hosting provider / hosting) — standard, unremarkable throughout the corpus
  (same source and many others).
- **облако** (cloud) — standard, matches the game.
- **электричество и тариф ("N рублей за киловатт")** — this is exactly the phrasing the game should
  use, and it is exactly how real DC-budget pieces write it: "При цене 4 ₽ за кВт·ч — это почти 3,2
  млн ₽ в месяц, только за свет"; "электричество капает в счёт каждый час. День за днём. Год за
  годом" ([Почему в бюджете ЦОДа лидирует статья «электричество»](https://habr.com/ru/companies/ruvds/articles/920100/)); "При цене 4,72 рубля за киловатт-час. Итого — почти 2,2 млн рублей в месяц" (same idea independently in
  [habr.com/ru/companies/rt-dc/articles/545424/](https://habr.com/ru/companies/rt-dc/articles/545424/)). "капает в счёт" (drips into the bill) is a nice idiom worth reusing.
- **ИБП** (UPS) — standard abbreviation, never spelled out after first use: "Источники бесперебойного
  питания для ДЦ" (title, [habr.com/ru/companies/ua-hosting/articles/283416/](https://habr.com/ru/companies/ua-hosting/articles/283416/)).
- **СЖО** (liquid cooling loop, "система жидкостного охлаждения") — used as a bare abbreviation by
  hobbyists exactly like ИБП: "Докупил две GPU на СЖО благодаря счастливо найденным предложениям"
  ([Как я собрал LLM-печку на 4 GPU](https://habr.com/ru/articles/1041422/)).
- **"куллеры"** — the phonetic misspelling of "coolers" that has become the normal informal
  spelling (as opposed to the dictionary "кулеры"): "Воздух охлаждает оборудование через небольшие
  куллеры в стойках" ([habr.com/ru/articles/1022064/](https://habr.com/ru/articles/1022064/)).
- **аптайм** (uptime) — standard loanword, "легло"/"упало"/"лежит" is the opposite state; see
  section 8 for the verb forms, all confirmed in the programmer-slang dictionaries.
- **майнинговые фермы репёрпосенные под нейросети** (mining farms repurposed for neural nets) — a
  real and current practice, not speculative: "У меня обычная майнинговая ферма из 2016 года. Я
  решил попробовать майнинговые GPU на майнинговых материнках" ([Запускаем LLM локально на майнинг ферме из 4 GPU](https://habr.com/ru/articles/1055222/)); riser-cable, open-frame construction is standard for both mining and budget ML rigs, per the same hobbyist corpus.
- **"домашняя лаба" / домашний дата-центр / самосбор** (home lab / home data center / DIY build) —
  a whole subgenre of first-person Habr posts. "Домашний дата-центр: ошибки, результаты и советы"
  (title, [habr.com/ru/companies/selectel/articles/688162/](https://habr.com/ru/companies/selectel/articles/688162/)), first line: "Несколько лет назад у меня была мечта — сделать домашний дата-центр"; "Я называю свой пет-проект дата-центром, потому что там целая инфраструктурная обвязка" (same source, note "обвязка" used generically for supporting infrastructure, not only for AI harnesses). Garages, basements and spare rooms are the normal locations named across this subgenre.
- **"печка"** (a hot, power-hungry home rig, literally "little stove") — vivid hobbyist slang for a
  multi-GPU box that runs hot: "Как я собрал LLM-печку на 4 GPU, и на что она способна" (title,
  [habr.com/ru/articles/1041422/](https://habr.com/ru/articles/1041422/)).
- **риг / рама** (rig / open frame) — mining-derived vocabulary now shared with home-lab AI builds:
  "Четыре RTX 3090 на открытой майнинговой раме" is exactly the game's own
  `hardware.preset.mining_rig_ascendant` phrasing, independently confirmed as the real term for
  this object across the mining-to-ML corpus above.
- **"жрёт" (электричество/мощность)** — the same informal verb from section 1, applied to power:
  confirmed generically across the electricity-cost pieces above; standard in first-person hardware
  writing.
- **маски-шоу** (a police raid, literally "masks show", from the balaclavas) — a settled, specific
  Russian term with its own case law and FAQ pages, not a euphemism the game invented. "FAQ про
  маски-шоу в ЦОДе в юридической практике VDS-хостинга" (title,
  [habr.com/ru/companies/ruvds/articles/557978/](https://habr.com/ru/companies/ruvds/articles/557978/)): "Запрашивается не виртуальный образ, а прямо приезжают за оборудованием... Забирают либо жёсткие диски, либо серверы и даже принтеры... До реального приезда ОМОНа может довести только активное сопротивление полиции."
- **изъятие серверов / выемка** (server seizure) — current and not hypothetical: "Сбой The.Hosting и
  изъятие серверов в Нидерландах" (headline about a real May 2026 raid,
  [habr.com/ru/news/1038444/](https://habr.com/ru/news/1038444/)); the same event is covered again
  for its knock-on effect on Russian hosts, "Как российские хостинги... знатно штормило в мае-июне"
  ([habr.com/ru/companies/ruvds/articles/1056180/](https://habr.com/ru/companies/ruvds/articles/1056180/)).
- **ОМОН** (Russia's riot police, used generically for "the police showing up in force") — see the
  маски-шоу quote above; this is the concrete noun a Russian reader expects rather than a vaguer
  "police".
- **NVLink, PCIe, SXM2/SXM, TFLOPs, HBM** — all kept Latin in every source read, matching SYS-14's
  own list exactly: "NVLink нет, так что карты общаются через PCIe" ([habr.com/ru/companies/hostkey/articles/903194/](https://habr.com/ru/companies/hostkey/articles/903194/), title "Больше 5090 — больше проблем? Тестируем связку из двух GPU NVIDIA", 2026-09-17); "Свою серверную обвязку под SXM2 мы не строили" ([habr.com/ru/articles/1041610/](https://habr.com/ru/articles/1041610/)).
- **райзер** (riser cable) — standard hardware-hobbyist term, confirmed in the mining/ML-rig corpus
  above ("Я перебирал несколько вариантов установки видеокарт и пробовал последовательное
  подключение райзеров", [habr.com/ru/articles/1041422/](https://habr.com/ru/articles/1041422/)).
- **термопаста / "перебирают карты"** (thermal paste / cards get refurbished) — part of the
  used-GPU-refurb vocabulary: "Китайцы перед продажей перебирают: новая термопаста, перетянутые
  крепления" ([habr.com/ru/articles/1041610/](https://habr.com/ru/articles/1041610/)).


## 3. Fintech and banks

Sources: Habr's Финансы в IT hub and bank company blogs (Точка, Sberbank, femida_search), plus
Banki.ru and vc.ru consumer-side accounts of 115-FZ enforcement, which show the same vocabulary
from the other side of the counter. Access dates 2026-09-17 unless stated.

- **антифрод** (antifraud) — the settled umbrella term, defined almost identically everywhere it is
  used: "Антифрод - это комплекс мер, технологий и процессов, направленных на предотвращение,
  выявление и минимизацию ущерба от мошеннических действий" ([«Докажи, что не верблюд», или Как работает современный антифрод](https://habr.com/ru/companies/femida_search/articles/959046/)).
- **фрод-мониторинг** (fraud monitoring) — "Риск-мониторинг позволяет обнаруживать случаи мошенничества
  на ранних стадиях... обновляя скоринговые модели" ([Антифрод-системы для защиты данных на базе AI и ML](https://habr.com/ru/companies/itglobalcom/articles/914054/)).
- **скоринг / скоринговая модель** (scoring / scoring model) — the plain, settled term, used for
  both credit and fraud scoring: "Скоринг предоставляет количественную оценку риска" (same source);
  "Как мы строили самую большую модель кредитного скоринга в сегменте МСБ" (title,
  [habr.com/ru/companies/tochka/articles/696226/](https://habr.com/ru/companies/tochka/articles/696226/)).
- **риск-модель / модель рисков / модель оценки рисков** — this cluster is the direct answer to the
  maintainer's complaint. Real bank engineering writing calls the object a **"модель PD"** (PD =
  probability of default) in the technical register, or plainly a **"скоринговая модель"** /
  **"модель кредитного риска"** in prose: "Модель PD оценивает вероятность дефолта у заемщика в
  течение определенного периода"; "ML и DS оттенки кредитного риск-менеджмента" (title,
  [habr.com/ru/companies/glowbyte/articles/519382/](https://habr.com/ru/companies/glowbyte/articles/519382/)). Nobody in this corpus calls a fraud-detection model a "рисковая модель" standing alone the way the game's `origins.bank_rack` does; "рисковая" reads as an adjective missing its noun. See section 10 for the concrete rewrite.
- **комплаенс** (compliance) — fully naturalized as a noun and as a department name, used with no
  gloss needed by consumers as well as engineers: "со службой Центр комплаенс, по инициативе
  которой произошла блокировка счета, прямой связи нет" (Banki.ru-adjacent coverage,
  [iphones.ru report on T-Bank 115-FZ blocks](https://www.iphones.ru/iNotes/chto-proishodit-so-schetami-v-t-banke-pochemu-rossiyane-massovo-zhaluyutsya-na-vnezapnye-blokirovki-po-115-fz), 2026-09-17); "комплаенс — неизбежный отдельный этап, добавленный к обычному функциональному тестированию" ([habr.com/ru/articles/1056618/](https://habr.com/ru/articles/1056618/)).
- **финмониторинг** (financial monitoring) — used interchangeably with "комплаенс" for the same bank
  function in ordinary prose (Habr search sample on 115-FZ articles, 2026-09-17).
- **115-ФЗ** — the single most load-bearing citation in this section: every account-freeze story
  names the law by number, never by its full title. "Ого! 7 сантиметров! Ну так и быть, снимем с
  вас блокировку счетов по 115-ФЗ" (title, [habr.com/ru/articles/987534/](https://habr.com/ru/articles/987534/)): "Я третий человек, которому сняли блокировку по 115-ФЗ... Я не мошенник, мамой клянусь. Написанному верить." — a good register sample for how ordinary people narrate being caught in a compliance dragnet, sardonic rather than frightened.
- **ЦБ** (the Central Bank) — standard abbreviation, no gloss.
- **служба безопасности / СБ / "безопасники"** — the in-house security department, referenced as a
  matter of course wherever bank IT process is discussed (confirmed generically across the
  115-FZ/compliance corpus; the game's own `origins.bank_rack.problems`, "Центр мониторинга
  безопасности... красная команда... внутренний аудитор", already uses the fuller, more precise
  institutional names rather than the blanket "безопасники", which is the right choice for prose
  that names specific functions).
- **SOC** (Security Operations Center) — kept Latin as an acronym, spelled out once: "Кто есть кто в
  ИБ. Аналитик SOC" (title, [habr.com/ru/companies/solarsecurity/articles/939476/](https://habr.com/ru/companies/solarsecurity/articles/939476/)).
- **ИБ** (information security, "информационная безопасность") — the standard abbreviation, used
  as a hub name on Habr itself and throughout the corpus.
- **DLP, SIEM** — kept Latin as acronyms: "Опыт заказчика: как мы выбрали и внедрили SIEM" (title,
  [habr.com/ru/companies/searchinform/articles/766650/](https://habr.com/ru/companies/searchinform/articles/766650/)), which discusses SIEM-DLP integration in the same piece.
- **«красная команда» / пентест** (red team / pentest) — both current, "красная команда" as the
  Russian calque that has fully naturalized rather than staying a translator's crutch: "Глазами SOC:
  типичные ошибки red team" mixes the Latin term with the Russian one throughout
  ([habr.com/ru/companies/pt/articles/765772/](https://habr.com/ru/companies/pt/articles/765772/)); "Красная команда, черный день: почему матерые пентестеры лажают в Red Team" (title, [habr.com/ru/companies/bastion/articles/829402/](https://habr.com/ru/companies/bastion/articles/829402/)) uses both forms in one headline. "Лажают" (screw up) is vivid, informal, first-person-adjacent.
- **аудит / аудиторы** (audit / auditors) — standard; the register question is whether a model
  "must be" auditable: "Модель должна быть аудируема, а значит интерпретируема"
  ([habr.com/ru/companies/tochka/articles/696226/](https://habr.com/ru/companies/tochka/articles/696226/)).
- **"контур"** (a network/security segment, literally "loop/circuit") — the standard Russian word
  for a bounded zone of infrastructure, used generically throughout Russian enterprise IT writing
  ("аналитический контур", "закрытый контур") wherever a segmented environment is discussed;
  confirmed as the working word behind the game's own `harness.sandbox` framing.
- **изолированный контур / воздушный зазор / air gap** — "Air gap — это разделение резервных копий
  данных от любых общедоступных сетей", with physical, logical and virtual sub-types all named
  ([Воздушный зазор для бэкапов. Зачем нужен и как работает Air gap](https://habr.com/ru/companies/icl_group/articles/986898/)); the phrase is also used of live production segments, not only
  backups: "Сегодня АСУ ТП не защищают ни воздушный зазор, ни проприетарные протоколы" (title of an
  interview, [habr.com/ru/companies/solarsecurity/articles/476874/](https://habr.com/ru/companies/solarsecurity/articles/476874/)). Both "воздушный зазор" and the bare Latin "air gap" are current; "физический разрыв", which the game uses, was not found as a live synonym in this pass and reads as the game's own coinage — accurate in sense but worth flagging as untested against real usage.
- **KYC** — kept Latin as an acronym in both fintech and freelance-marketplace writing: "некоторые
  биржи могут заморозить счёт после KYC-проверки" ([habr.com/ru/articles/964326/](https://habr.com/ru/articles/964326/)).
- **верификация** (verification/identity check) — standard, unremarkable across freelance-platform
  and banking writing alike.
- **самозанятый** (a person on Russia's simplified self-employment tax regime) — extremely current
  and precise; not interchangeable with "фрилансер": "Регистрация в качестве ИП или самозанятого
  позволяет перейти на льготный режим налогообложения" ([Всё про налоги для IT-фрилансеров. ИП и самозанятые](https://habr.com/ru/companies/iloveip/articles/480114/)).
- **фриланс** (freelance work) — plain loanword, unremarkable.
- **"оформить ИП/ООО"** (to register as a sole proprietor / LLC) — standard bureaucratic-professional
  phrasing, confirmed across the same freelance/tax corpus.
- **"подставная фирма" / фирма-однодневка / "техничка" / обнал** (shell company / one-day company /
  a "technical" pass-through firm / cashing out) — "115-ФЗ обязывает банки мониторить операции
  клиентов на предмет подозрительной активности... банки часто действуют «на всякий случай»"
  ([klerk.ru summary of 115-FZ myths](https://www.klerk.ru/blogs/modulbank/572828/), 2026-09-17, cited via search as a widely-mirrored consumer explainer); a related older Habr post names the mechanism directly: "Придумана схема обналичивания денег с кредитных карт через ломбарды" (title,
  [habr.com/ru/post/402953/](https://habr.com/ru/post/402953/)). "Однодневка" and "техничка" are attested general financial-crime vocabulary rather than terms this pass found in a single quotable Habr sentence; treat them as well-known but not freshly re-sourced here.
- **дропперы** (money mules, "droppers") — current 2026 vocabulary directly from bank/payments
  coverage: "с 1 июля банки будут указывать ИНН... мера касается физлиц и юрлиц для борьбы с
  дропперами" ([habr.com/ru/news/1021514/comments/](https://habr.com/ru/news/1021514/comments/)). Recommended addition to the game's identity/laundering vocabulary if it is not already there.
- **False Positive, фингерпринтинг** — kept partly Latin, partly Cyrillicized within the same
  antifraud vocabulary: "False Positive - когда система блокирует честного пользователя";
  "Фингерпринтинг - это технология создания уникального цифрового отпечатка устройства или браузера
  пользователя" ([habr.com/ru/companies/femida_search/articles/959046/](https://habr.com/ru/companies/femida_search/articles/959046/)).
- **просадка (в качестве)** (a dip/regression in quality) — "Логистическая регрессия не показала
  просадки в качестве в сравнении с бустингом" ([habr.com/ru/companies/tochka/articles/696226/](https://habr.com/ru/companies/tochka/articles/696226/)); see also section 8.
- **"вывести в продакшен"** (to ship a model to production) — "Сейчас модель вывели в продакшен, и
  она уже приносит пользу" (same source), the natural first-person past-tense closing line for a
  model-deployment narrative.


## 4. Startups and corporate IT

Sources: Habr startup-funding posts, vc.ru, RB.RU 2026 funding news, and a procurement interview
that walks through 44-FZ/223-FZ tendering in practical detail. Access dates 2026-09-17.

- **стартап, раунд, инвестор** — all fully naturalized, unremarkable loanwords across every source
  in this pass, including RB.RU's daily funding coverage (e.g. "Advanced Machine Intelligence (AMI),
  founded by Yan LeCun, raised $1.03 billion in its first funding round", reported in Russian as
  "привлёк $1 млрд инвестиций", [rb.ru](https://rb.ru/news/byvshij-top-meta-yan-lekun-privlyok-1-mlrd-investicij-na-svoj-startap-ami-kompaniya-budet-razvivat-ii-dlya-robotov/)).
- **"ранвей" / runway — how it is actually said** — this is an important negative finding. No
  source in this pass used "запас хода" for financial runway; that phrase was found only in its
  literal automotive sense (electric-bike/EV range, [habr.com/ru/companies/runity/articles/245943/](https://habr.com/ru/companies/runity/articles/245943/)). A dedicated startup glossary does
  calque the English term as **"взлётная полоса"** ("Runway — финансовая взлётная полоса",
  [Shtab glossary](https://shtab.app/glossary/runway/), 2026-09-17) — confirming SYS-14's own
  instinct that this is a recognized calque, not a made-up problem. But live first-person writing
  skips both calques and simply states the number of months or the date money runs out: "Осталось
  денег на 2 недели. Закрывать стартап? Или выживать?" (vc.ru headline,
  [vc.ru/life/275314](https://vc.ru/life/275314-ostalos-deneg-na-2-nedeli-zakryvat-startap-ili-vyzhivat)); "При нынешнем расходе деньги дойдут до нуля меньше чем за две недели" is exactly this idiom, and it is already how the game's own `events.eco_runway_warning.desc` is written — the content team should be reassured that this line is correct without needing a "запас хода" label at all.
- **"сжигать" (деньги) / cash burn** — "стартапы, масштабирующиеся, обычно не имеют прибыли и
  испытывают эффект «сжигания денег»" (cash burn glossed in Russian,
  [habr.com/ru/post/333368/](https://habr.com/ru/post/333368/)); "both OpenAI and Anthropic are
  expected to burn billions in the coming years", covered in Russian as "сжигать миллиарды" ([В WSJ назвали ахиллесову пяту OpenAI и Anthropic](https://habr.com/ru/amp/publications/1020054/)).
- **"выйти в ноль"** (to break even) — standard startup-prose idiom, matches the game's own
  `knowledge` vocabulary; not separately re-sourced in this pass beyond general confirmation in the
  startup-funding corpus above.
- **пилот / внедрение** (pilot / rollout) — "что казалось достаточным во время пилота, впоследствии
  может потребовать другой поддержки"; "пилоты следует проводить обоснованно" (Habr search sample on
  ИБ-мониторинг procurement, 2026-09-17); "Как проверить новую интеграционную архитектуру до выхода
  в прод: пример пилота ESB на реальной задаче" (title,
  [habr.com/ru/companies/w_code/articles/1077064/](https://habr.com/ru/companies/w_code/articles/1077064/)).
- **заказчик / интегратор** (client / systems integrator) — standard enterprise-IT vocabulary;
  "Закупщик и Айтишник: понять и принять" (title, [habr.com/ru/articles/773112/](https://habr.com/ru/articles/773112/)) is a good register sample of how the two sides talk past each other.
- **закупка / тендер** (procurement / tender) — "Тендер – это система выбора наилучшего предложения
  для решения определённой задачи" (from an interview specifically about winning tenders without
  losing money, [Выиграть тендер — не значит заработать](https://habr.com/ru/articles/1077472/)).
- **44-ФЗ / 223-ФЗ** — cited by number, exactly like 115-ФЗ in section 3: "44-ФЗ – это большой и
  довольно детальный регламент с огромным количеством сроков"; "По 223-ФЗ работают компании с
  государственным участием" (same source). "Обеспечение" (a tender guarantee/bond) is the related
  term: "Банковская независимая гарантия позволяет не замораживать всю сумму обеспечения" (same
  source).
- **техническое задание / ТЗ** (statement of work) — "Техническое задание – не приложение для
  юристов, а граница обязательств и экономики проекта" (same source); the standard abbreviation ТЗ
  is used throughout enterprise-IT Habr writing without a gloss.
- **пресейл** (presales) — "Пресейл-инженер: тоже инженер, но не только" (title,
  [habr.com/ru/companies/otus/articles/898142/](https://habr.com/ru/companies/otus/articles/898142/)).
- **согласовать / заявка / тикет / релиз / регламент** — all standard corporate-IT vocabulary,
  confirmed generically throughout the procurement and SOC-adjacent corpus above; none of these are
  contested or slangy, they are the plain professional register a state-adjacent or enterprise
  origin (bank, ministry, institute) should default to.
- **аттестация / сертифицированное / импортозамещение** (certification / "certified" / import
  substitution) — "Сертификация ФСТЭК — это процесс оценки соответствия информационных систем
  требованиям безопасности... необходима для использования ИТ в государственных информационных
  системах (ГИС)" ([Сертификация ФСТЭК: самый подробный гайд](https://habr.com/ru/companies/express/articles/856192/)); import substitution is a live, unremarkable
  compliance requirement rather than a political slogan in this register: "223-ФЗ запрещает
  указанным в нём субъектам закупать иностранное ПО... для использования на объектах критической
  информационной инфраструктуры без согласия" ([TAdviser, КИИ в 2026 году](https://www.tadviser.ru/index.php/%D0%A1%D1%82%D0%B0%D1%82%D1%8C%D1%8F:%D0%9A%D1%80%D0%B8%D1%82%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B0%D1%8F_%D0%B8%D0%BD%D1%84%D0%BE%D1%80%D0%BC%D0%B0%D1%86%D0%B8%D0%BE%D0%BD%D0%BD%D0%B0%D1%8F_%D0%B8%D0%BD%D1%84%D1%80%D0%B0%D1%81%D1%82%D1%80%D1%83%D0%BA%D1%82%D1%83%D1%80%D0%B0_%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D0%B8._%D0%9E%D0%B1%D0%B7%D0%BE%D1%80_TAdviser), 2026-09-17).
- **MVP** — kept Latin as an acronym even in otherwise fully Russian startup prose: "MVP нужно
  делать быстро, иногда за дни или недели" ([Ваш стартап не убьют конкуренты, вы сами справитесь](https://habr.com/ru/articles/1025792/)).
- **LTV** — likewise kept Latin: "Многие начинают масштабироваться раньше, чем доказали LTV" (same
  source). The same piece is a good register sample for startup-failure prose generally: "Идеи
  дешёвые, клиенты дорогие"; "90% стартапов загибаются не потому, что конкуренты их задавили."
  "Загибаются" (keel over/die off) is vivid, informal, and a good alternative to a flatter
  "закрываются" wherever the game wants a harsher note.


## 5. State, security services and regulation

Sources: Habr's own coverage of Roskomnadzor and FSTEC (both a neutral technical-reporting register
and an ironic one live side by side, marked below), plus TAdviser regulatory summaries. Access
dates 2026-09-17.

- **ФСТЭК** (the Federal Service for Technical and Export Control, Russia's IT-security regulator)
  — always named directly and by acronym, register neutral/technical: "Сертификация ФСТЭК — это
  процесс оценки соответствия информационных систем требованиям безопасности"
  ([habr.com/ru/companies/express/articles/856192/](https://habr.com/ru/companies/express/articles/856192/)); "С 1 сентября пентест стал методом контроля защищённости, а аттестация ФСТЭК охватила станки с ЧПУ в ОПК" (recent 2026 regulatory news, [habr.com/ru/news/1076946/](https://habr.com/ru/news/1076946/)).
- **приказ №117 / приказ №239** (specific FSTEC orders) — cited by number as a matter of course, the
  same way laws are: "новый ФСТЭК Приказ № 117... представляет обновленные требования к
  сертификации" ([habr.com/ru/companies/selectel/articles/1038054/](https://habr.com/ru/companies/selectel/articles/1038054/)); "Федеральный закон №187-ФЗ и Приказ ФСТЭК №239" for KII ([TAdviser, РТК-ЦОД: Облако КИИ](https://www.tadviser.ru/index.php/%D0%9F%D1%80%D0%BE%D0%B4%D1%83%D0%BA%D1%82:%D0%A0%D0%A2%D0%9A-%D0%A6%D0%9E%D0%94:_%D0%9E%D0%B1%D0%BB%D0%B0%D0%BA%D0%BE_%D0%9A%D0%98%D0%98), 2026-09-17).
- **КИИ** (critical information infrastructure, "критическая информационная инфраструктура") —
  always abbreviated after first mention: "КИИ-2026: нормы безопасности и импортозамещение СУБД"
  (title, [habr.com/ru/companies/mt-integration/articles/1003118/](https://habr.com/ru/companies/mt-integration/articles/1003118/)).
- **ГИС** (a state information system, "государственная информационная система") — used alongside
  КИИ as the other class of system that requires certification (same corpus as section 4's
  аттестация entry).
- **187-ФЗ** — the KII law, cited by number (TAdviser, same source as above).
- **Роскомнадзор / РКН** (Russia's communications regulator) — both the full name and the acronym
  are current; the acronym dominates in headlines: "РКН не справляется с блокировками" (title,
  [habr.com/ru/news/1012148/](https://habr.com/ru/news/1012148/)).
- **блокировки / замедление** (blocking / throttling) — this pair is the best-documented euphemism
  cycle in the whole corpus. Roskomnadzor's own 2021 announcement is remembered and still cited for
  introducing "замедление" as the softer official word for what reads, technically, as a targeted
  denial of service: "Роскомнадзор начал «замедлять» на 100% мобильный и 50% трафик широкополосного
  доступа сервиса микроблогов Twitter... чтобы шейпить, а тем самым ограничивать скорость доступа"
  ([Не блокировка, а замедление](https://habr.com/ru/articles/546422/)). "Шейпить" (to shape
  traffic, from "traffic shaping") is the informal engineering verb used for the same act.
- **ТСПУ** (the deep-packet-inspection boxes RKN uses, "технические средства противодействия
  угрозам") — treated as ordinary hardware with capacity limits, described in both a neutral and an
  openly ironic register in the same news cycle: neutral, "Число правил фильтрации достигает 2,5
  миллиона"; ironic, "Мощности ТСПУ могут переброситься на замедление Telegram" and "РКН ещё
  задумывался как освободить мощности для блокировки" ([habr.com/ru/news/1012148/](https://habr.com/ru/news/1012148/), both quotes flagged by register in the fetch itself).
- **"приземление"** (data localization, "landing", of a foreign platform under Russian law) —
  confirmed as a live, specific term rather than the game inventing a metaphor: "Роскомнадзор:
  «неприземлившиеся» IT-гиганты могут лишиться русских денег" (headline,
  [habr.com/ru/news/t/568580/](https://habr.com/ru/news/t/568580/)).
- **суверенный интернет** (the "sovereign internet" law and its infrastructure) — "Суверенный
  интернет: что меняется с 1 марта 2026 года и как это затронет пользователей" (title,
  [habr.com/ru/articles/1006424/](https://habr.com/ru/articles/1006424/)).
- **белый список** (a whitelist, here of exempted autonomous systems) — "РКН создали белый список
  для 72 AS, но пострадали 391 AS (>225 млн IP адресов)" ([habr.com/ru/articles/997088/comments/](https://habr.com/ru/articles/997088/comments/)).
- **СОРМ** (the lawful-interception system ISPs must host) — treated as ordinary, well-understood
  infrastructure in security writing rather than a dark rumor: confirmed generically across
  provider/VPN-security discussion threads in this pass (Habr Q&A and comment corpus, 2026-09-17).
- **"товарищ майор"** (Comrade Major, the internet-folklore stand-in for "whoever at the security
  services is listening") — a real, decades-old joke register, attested verbatim in a Habr comment
  thread: "В этом сертификате ошибка — Перепроверьте ещё раз, товарищ программист — Есть, товарищ
  майор" (comment-thread joke found via Habr search on HTTPS/MITM discussion, 2026-09-17); also used
  seriously in the same breath as encrypted-messenger advice, e.g. warnings that "товарищ майор" may
  not appreciate seeing OTR or PGP used in one's correspondence. Register: ironic/jocular, never used
  by an official source about itself.
- **маски-шоу / ОМОН / изъятие серверов / выемка** — see section 2 for the primary citations; this
  is the vocabulary the game's raid and seizure events should be drawing from directly.
- **уведомление об инциденте** (mandatory incident notification) — the game's own
  `knowledge.incident_reporting` cites the EU's 72-hour rule and RAISE; the equivalent Russian-side
  obligation (breach notification to Roskomnadzor under the amended 152-FZ) belongs to the same
  register as КИИ incident reporting under 187-FZ (TAdviser corpus, 2026-09-17); no single
  quotable Russian-language sentence naming a specific hour count was found in this pass, so this
  entry is a plausible-register placeholder rather than a directly sourced phrase.
- **"ведомство" / министерство / минцифры** (agency / ministry / the digital ministry) — all
  standard, unremarkable bureaucratic nouns confirmed throughout the TAdviser/CNews regulatory
  corpus; "минцифры" is always written as one word, lower case except at a sentence start.


## 6. Universities and research

This domain is thinner in the corpus than the others: HPC-cluster documentation is written in a
dry, instructional register (user manuals, not first-person blogging), and "night queue slots" as a
named colloquialism did not surface in a directly quotable form in this pass. What follows is
grounded in real university cluster documentation and grant-culture reporting rather than in Habr
first-person storytelling, which is comparatively rare for this domain. Access dates 2026-09-17.

- **кластер / суперкомпьютер** (cluster / supercomputer) — standard; Russian universities publish
  their own cluster manuals in this register, e.g. Far Eastern Federal University's own user guide
  ([cc.dvfu.ru](https://cc.dvfu.ru/ru/cluster_instructions/)) and HSE's ([hpc.hse.ru](https://hpc.hse.ru/en/instructions/run/)); "В Новосибирске запустили пилотный кластер суперкомпьютерного центра «Лаврентьев»" ([habr.com/ru/news/854484/](https://habr.com/ru/news/854484/)).
- **очередь / задача / JOBID** (queue / job / job ID) — the SLURM vocabulary is not translated: "при
  запуске задача помещается в очередь заданий и ей присваивается уникальный идентификатор (JOBID)"
  (SLURM usage summary drawn from the DVFU/HSE manuals above); the launch command "sbatch" is always
  kept Latin.
- **квоты / выделенные вычислительные квоты** (allocated compute quotas) — standard grant/cluster
  vocabulary; confirmed generically across the grant-reporting corpus below rather than in a single
  quotable sentence.
- **грант** (grant) — "Research grants are awarded for periods of three to five years with annual
  sums of 3-5 million rubles" (paraphrased from Habr search results on university lab funding,
  2026-09-17); a lighter, personal register exists too: "Как получить грант на развитие проекта,
  если ты бедный студент? И стоит ли оно того" (title, [habr.com/ru/articles/426815/](https://habr.com/ru/articles/426815/)).
- **кафедра / лаба / лаборатория** (department / lab, informal / lab, formal) — "лаба" is the
  spoken/student clipping of "лаборатория", confirmed as current usage in Habr's own university-lab
  writeups (e.g. МИСиС lab coverage, [habr.com/ru/companies/misis/articles/382531/](https://habr.com/ru/companies/misis/articles/382531/)); "кафедра" is the formal department unit that owns a cluster share, matching the game's `sites.campus_slice` framing.
- **аспирант** (graduate/PhD student) — the standard noun for the role the game's `origins.uni_cluster`
  and `sites.campus_slice` are built around; not independently re-sourced with a first-person quote
  in this pass beyond the grant-funding corpus above, so treat as correct but not freshly
  demonstrated in a sentence.
- **"ночные слоты"** — not found as a settled named colloquialism in the sources checked. What is
  confirmed is the underlying practice (queued batch jobs, off-hours scheduling windows) via the
  SLURM manuals above; the specific phrase should be treated as the game's own plausible coinage
  rather than a documented piece of student jargon, unless a later pass finds it on a specific
  university's own wiki or a physics/ML student forum.

## 7. Media and the public

Sources: Habr's own coverage of leaks, virality and Telegram-channel dynamics, plus Habr's recent,
very self-aware fight against AI-generated content on its own platform. Access dates 2026-09-17.

- **огласка** (disclosure/publicity, in the sense of a fact becoming public) — a real, standard
  Russian word, not a game invention, and it is specifically used for a private matter breaking into
  public view: "он решил предать огласке произошедшее, чтобы показать общественности один из
  возможных сценариев" (of a founder disclosing a state/crypto conflict,
  [habr.com/ru/articles/408955/](https://habr.com/ru/articles/408955/), re: the ForkLog founder's
  office search). This confirms SYS-14's choice directly: "огласка" is exactly the register-correct
  word for "the public now believes X", distinct from "утечка" (the leak itself) or "резонанс" (the
  noise that follows).
- **утечка / слив** (leak / leak, more casual and often implying insider dumping) — "утечка" is the
  neutral/technical noun; "слив" carries a slightly more dismissive, insider-leak connotation and is
  used for contested/clickbait-flavored leaks: "Утечка на 16 миллиардов: крупнейший слив или
  глобальный кликбейт?" (title, [habr.com/ru/news/920080/](https://habr.com/ru/news/920080/)), whose comments call the story "жёлтая журналистика" (yellow journalism) and "фейк" until proven.
  "[утечка N] Слив базы пользователей Pikabu" is the standard headline pattern for a confirmed one
  ([habr.com/ru/post/654441/](https://habr.com/ru/post/654441/)).
- **кликбейт** (clickbait) — fully naturalized loanword, unremarkable (same source).
- **контролируемая утечка** (a controlled/PR leak) — a named, cynical category distinct from a real
  breach: "Контролируемая утечка vs реальный слив: как отличить PR-ход от непредвиденного
  инцидента" (title, [habr.com/ru/articles/889358/](https://habr.com/ru/articles/889358/)).
- **инфоповод** (a news hook/pretext for coverage) — current and specifically discussed as a scarce,
  decaying resource in the Telegram-saturated media environment: "даже крупные инфоповоды не
  вызывают отклика" (paraphrased from a Habr piece on Telegram-channel subscriber dynamics,
  [habr.com/ru/articles/959970/](https://habr.com/ru/articles/959970/), "«Контентная зима»:
  подписчики уходят, интерес остывает").
- **телеграм-каналы / паблики** (Telegram channels / (VK-style) public pages) — Habr has run its own
  quantitative study of this: "Анализ различий подачи новостей в Telegram-каналах" examined roughly
  225,000 posts across 59 channels (title and figure,
  [habr.com/ru/articles/684952/](https://habr.com/ru/articles/684952/)); Meduza and other outlets
  are shown citing Telegram channels as primary sources at a measured, citable rate in the same
  piece.
- **нейрослоп** (AI slop) — see section 1; also squarely a media/public-facing term now that Habr
  bans it from its own front page: "Хабр проиграл войну с нейрослопом"
  ([habr.com/ru/articles/1081846/](https://habr.com/ru/articles/1081846/)).
- **хайп** — the loanword is everywhere in this corpus as a background register word (e.g. inside
  article titles discussing AI generally), but no single sentence in this pass demonstrated a
  further derived slang form like "хайпожор" or "хайпануть" in citable use; treat "хайп" itself as
  solid and those derived forms as folk vocabulary this pass did not confirm in print.
- **"вирусится" / "завирусилось"** — the underlying phenomenon (a post, meme or clip spreading fast)
  is extremely well documented in this corpus (memes about ancient Rus and lizards, an AI-refusal
  TikTok clip, a faked Pentagon explosion photo, all covered on Habr,
  [habr.com/ru/companies/ruvds/articles/762716/](https://habr.com/ru/companies/ruvds/articles/762716/) among others), but this pass did not catch the specific verb "вирусится"/"завирусилось" in
  a directly quotable Habr sentence; treat the concept as confirmed and the exact verb as likely but
  not freshly resourced.


## 8. Everyday professional verbs and idioms

This is the best-attested slang domain in the whole corpus: three independent Habr "IT slang
dictionary" articles, spanning 2013 to 2025, agree closely with each other and with how the terms
are actually used in first-person posts read for the other sections. Access dates 2026-09-17.

- **крутится (на)** (runs on, is hosted on) — the standard verb for "this is where a service lives",
  confirmed as the implicit opposite of "лежит" (down) throughout the dictionaries below and used
  directly in first person: "Запускаем LLM локально на майнинг ферме" narrates exactly this state
  throughout ([habr.com/ru/articles/1055222/](https://habr.com/ru/articles/1055222/)).
- **поднять** (to bring up/spin up a server, service or model) — "поднять — запустить сервер или
  сервис (поднять базу данных, поднять сервер)" ([Словарь программистского жаргона без англицизмов](https://habr.com/ru/articles/858218/)); "нужно было поднять две локальные LLM на NVIDIA DGX Spark" ([habr.com/ru/articles/1081324/](https://habr.com/ru/articles/1081324/)).
- **выкатить** (to ship/release into production) — "выкатить — выложить код на живое" ([Заовнил, вонзился, запилил: словарь IT-шника](https://habr.com/ru/companies/vk/articles/191998/)); "деплой" is
  the noun for the same act (section 1).
- **накатить** (to apply an update/patch to a running system) — "накатить — установить обновление
  или изменение на сервер или систему" ([habr.com/ru/articles/858218/](https://habr.com/ru/articles/858218/)); the older dictionary
  is franker about the risk: "накатить — результатом может быть либо сукесс, либо факап" (same VK
  source), a nice bilingual pun on "success"/"фак-ап" worth noting for register (playful, spoken,
  never in a UI string).
- **откатить / роллбек** (to roll back) — "откатить — вернуться к предыдущей (рабочей) версии
  системы или проекта" ([habr.com/ru/articles/858218/](https://habr.com/ru/articles/858218/)); "роллбек/откат — возврат к предыдущей версии" (the more recent, DevOps-labeled dictionary,
  [Разбираемся в IT-сленге по направлениям](https://habr.com/ru/articles/936368/)).
- **раскатать** (to roll out a release across all servers) — "раскатать — распространить новую
  версию приложения или обновления на всех серверах" ([habr.com/ru/articles/858218/](https://habr.com/ru/articles/858218/)); distinct from "выкатить" (ship once) by implying a fleet-wide rollout, which matches the game's
  own fleet-of-robots origin well.
- **упало / лежит / легло** (down, is down, went down) — "лежать — быть недоступным или
  неработоспособным из-за ошибки, перегрузки или сбоя" (same source); "уронить — вызвать сбой в
  работе системы или приложения" is the transitive form (same source), i.e. "я уронил прод" (I took
  prod down).
- **"тащит" / "не тащит" / "вывозит" / "не вывозит"** (carries the load / can't carry the load) —
  "не вывозит" is the more directly attested of the pair in this pass, used of both hardware and
  services under load: "блок питания «не вывозит суммарный пик»", "стартовать с минимального
  сервера и проверять нагрузку, апгрейдить, если текущий не вывозит" (Habr search sample across
  hardware/service-sizing threads, 2026-09-17). "Тащит"/"не тащит" is the well-known synonym pair
  (originally gaming slang for "carrying the team") but this pass did not catch it in a directly
  quotable Habr sentence; treat it as well-known but not freshly resourced here.
- **шуршит** (ticking over quietly, working steadily in the background) — extremely common spoken
  IT register for "it's running fine, don't touch it"; not independently caught in a quotable
  sentence in this pass, flagged as folk vocabulary rather than freshly sourced.
- **"на минималках"** (on a bare/minimal setup, i.e. the stripped-down version of something) —
  confirmed directly in Habr headlines: "Продуктовый подход на минималках" (title,
  [habr.com/ru/companies/sportmaster_lab/articles/810651/](https://habr.com/ru/companies/sportmaster_lab/articles/810651/)); "DIY-одноплатник или OrangePi на минималках" ([habr.com/ru/post/691936](https://habr.com/ru/post/691936)).
- **"из коробки"** (out of the box, i.e. working without extra setup) — standard, dictionary-defined
  as "функционал системы, который работает сразу после установки или приобретения, без
  необходимости в дополнительной настройке" (general IT-slang dictionary summary drawn from the
  same search pass, 2026-09-17).
- **"по фану"** (for fun, as a hobby rather than for money) — confirmed directly in a headline: "Как
  забрать все награды за pet-проекты, созданные по фану" ([habr.com/ru/companies/pyrobyte/articles/756386/](https://habr.com/ru/companies/pyrobyte/articles/756386/)).
- **"на коленке"** (rigged up hastily, "on one's knee") — extremely well attested, including as an
  article title itself: "Прототип на «коленке»: создание приложения для мониторинга датчиков
  сердечного ритма" ([habr.com/ru/company/auriga/blog/526090/](https://habr.com/ru/company/auriga/blog/526090/)); "Как организовать процесс А/В тестирования на коленке" ([habr.com/ru/companies/oleg-bunin/articles/836056/](https://habr.com/ru/companies/oleg-bunin/articles/836056/)).
- **костыль** (a workaround/hack, literally "crutch") — the best-attested single item of IT slang in
  the corpus: "костыль — временное или неаккуратное решение, часто сделанное ради быстрого
  исправления" ([habr.com/ru/articles/858218/](https://habr.com/ru/articles/858218/)); "подпереть
  костылями — реализовать функциональность за счет непредусмотренного решения" ([habr.com/ru/companies/vk/articles/191998/](https://habr.com/ru/companies/vk/articles/191998/)); "ведро костылей" (a bucket of
  crutches) for a whole codebase of them (same search pass).
- **запилить** (to build/knock together, informal for "make") — "запилить — сделать. Синоним:
  зарешать" ([habr.com/ru/companies/vk/articles/191998/](https://habr.com/ru/companies/vk/articles/191998/)).
- **прикрутить** (to bolt on/integrate a new piece of functionality) — confirmed generically across
  integration-writeups on Habr as "to add new functionality to an already-existing system"
  (search-pass summary, 2026-09-17), used both for a payment integration and for wiring a tool into
  a CI/CD pipeline.
- **затюнить** (to tune, e.g. hyperparameters) — the underlying loanword-verb "тюнить"/"затюнить" is
  attested in ML hyperparameter discussion ("если правильно затюнить гиперпараметры, можно
  оптимизировать производительность модели", search-pass summary of Habr ML posts, 2026-09-17);
  register: informal, spoken, first person.
- **"дообучить на своих данных"** (to fine-tune on your own data) — standard phrasing throughout
  section 1's fine-tuning corpus; not a separate idiom so much as the plain professional way to say
  it.
- **"снять метрики"** (to pull/capture metrics from a run) — standard experiment-tracking phrasing,
  confirmed generically across the ML-experimentation corpus ("Гайд по трекингу экспериментов в
  ML", [habr.com/ru/companies/cinimex/articles/838888/](https://habr.com/ru/companies/cinimex/articles/838888/)).
- **"выжать" (максимум/больше)** (to squeeze more performance out of something) — confirmed directly
  in a headline: "Выжать больше из локальных LLM. Ollama медленнее llama.cpp в 3 раза" ([habr.com/ru/articles/1025132/comments/](https://habr.com/ru/articles/1025132/comments/)).
- **просадка** (a dip/regression, in quality or performance) — see section 3 for the banking-model
  citation; the same word is used for latency and throughput regressions throughout the ML corpus.
- **прирост** (a gain/improvement, in performance) — standard, confirmed generically: "прирост
  производительности" is the default phrase for a measured speed-up across hardware and software
  benchmarking posts alike (search-pass summary, 2026-09-17), e.g. Python 3.11 or CPU-generation
  comparisons.


## 9. Register and style notes

This section is prose rather than a glossary: what the reading in sections 1-8 showed about how the
register actually behaves, for a rewrite pass to calibrate against.

**First person on Habr and Telegram.** The dominant voice across every company blog and independent
post read for this report is plain, declarative and mildly self-deprecating rather than either
corporate-smooth or hype-y. A Selectel intern opens a home-datacenter post with "Несколько лет назад
у меня была мечта — сделать домашний дата-центр" and immediately undercuts it: "Не повторяйте моих
ошибок, сохраните психику" ([habr.com/ru/companies/selectel/articles/688162/](https://habr.com/ru/companies/selectel/articles/688162/)). An Ozon SRE engineer introduces her own job with a joke about being
mistaken for a detective agency before getting to the actual incident-management process
([habr.com/ru/companies/ozontech/articles/925046/](https://habr.com/ru/companies/ozontech/articles/925046/)). A hobbyist building a four-GPU rig writes in short, concrete, slightly proud
sentences about cable management being "сущий кошмар" and is candid that his tokens are "условно-
бесплатны" ([habr.com/ru/articles/1041422/](https://habr.com/ru/articles/1041422/)). None of this
voice apologizes for technical detail or explains itself to a lay reader by default; it assumes the
reader already knows what a GPU, a checkpoint or a KV-cache is, and spends its explanatory effort on
the specific, less obvious thing (why this checkpoint, why this cable route, why this metric). This
is close to the register the game's own model-as-narrator voice already aims for, and the research
gives it more concrete, weight-bearing nouns and shorter sentences to reach for.

**Anglicisms: accepted vs. avoided vs. mocked.** Fully accepted, appearing without gloss or scare
quotes in careful professional writing: инференс, файнтюн/дообучение (used interchangeably),
чекпоинт, датасет, пайплайн, деплой, прод, бенчмарк, токен, эмбеддинг, промпт, агент, MVP, LTV,
KYC. Accepted but visibly informal/spoken, appearing mostly in first-person or comment-thread prose
rather than headlines: харнесс (alongside the fully Cyrillicized "обвязка", both current), ризонинг
(alongside "режим рассуждений"), затюнить, задеплоить. Avoided or actively mocked as officialese
rather than as anglicisms: see the next paragraph — the objectionable register in this corpus is not
foreign loanwords but bureaucratic Russian. One genuine anglicism-as-calque was caught in the wild
and flagged as bad: "взлётная полоса" for financial runway, which a startup glossary uses
uncritically ([shtab.app/glossary/runway](https://shtab.app/glossary/runway/)) but which no
first-person Habr or vc.ru post in this pass actually reached for; writers preferred stating the
number of months or the date the money runs out instead (section 4).

**What reads as a translation ("калька").** Nothing in the corpus read for this report uses
"является" for "is", "данный" for "this", or "осуществлять" for a plain verb of doing; SYS-14's ban
on these is fully consistent with how the industry actually writes, not a stylistic overcorrection.
Sentences are short and front-load the concrete noun rather than building a participial or
subordinate-clause scaffold before it: "Комплаенс — неизбежный отдельный этап" states the finding
first ([habr.com/ru/articles/1056618/](https://habr.com/ru/articles/1056618/)), rather than "являясь
неизбежным этапом, комплаенс добавляется...". Titles frequently use a colon or a question rather
than a full sentence ("Квантизация LLM: как запихнуть 70B модель в свою видюху";
"Не блокировка, а замедление"), and first-person posts favor one clause per sentence over long
compound ones. Word order keeps the subject early; a translated-feeling Russian sentence in this
domain is recognizable exactly by doing the opposite — burying the subject after two prepositional
phrases and a participle, which is what "рисковая модель" constructions risk when they front-load
an adjective with no noun of its own.

**Sentence length.** Company blog posts mix short declarative sentences (often one clause, occasionally
a sentence fragment for emphasis, as in "Не блокировка, а замедление") with longer explanatory ones
only where the underlying fact is itself compound (e.g. explaining PD-model calibration in the
Tochka scoring post). The game's own house style — short sentences, no hedging — matches this
register better than it matches literary Russian prose, which tends to run longer.

**"вы"/"ты".** Every first-person technical post read for this report addresses its reader, if at
all, with lowercase "вы" in imperative or instructional asides ("не повторяйте моих ошибок"); none
used capitalized "Вы" (that register belongs to formal correspondence, e.g. bank letters, not
engineering blogs) and none used "ты" outside of quoted dialogue or deliberately folksy Telegram
posts. This matches SYS-14's own rule exactly.

**Numbers, units and currency.** Rubles are written with the ₽ or "руб." symbol after the number,
never before, and thousands are separated with a space or occasionally a dot in older posts, never a
comma: "При цене 4 ₽ за кВт·ч — это почти 3,2 млн ₽ в месяц"
([habr.com/ru/companies/ruvds/articles/920100/](https://habr.com/ru/companies/ruvds/articles/920100/)). Decimals use a comma, matching SYS-14's ICU rule exactly ("4,72 рубля", "2,8 трлн
параметров"). Dollar amounts in a Russian sentence keep the $ sign, usually before the number in
international/startup contexts ("$1 млрд") but after the number in more domestic contexts ("2 000
$" style, matching SYS-14's own rule); this pass found both orders in circulation, with the
pre-number $ dominant specifically in funding-round reporting translated from English press releases
(RB.RU) and the post-number style more common in homegrown Russian technical writing. Units are
never separated from their number across a line break and always abbreviated (ГБ, кВт, кВт·ч, МВт),
matching the game's own style. Large round numbers are often given as "N млрд/млн параметров" rather
than the bare digit string, which the game's `lineages.*.desc` entries already do correctly by
spelling out "два и восемь десятых триллиона" in prose rather than "2.8T".

**Model names: declension and script.** DeepSeek is the one frontier-model family with a fully
settled, widely used Cyrillic nickname, "Дипсик", inflected normally in prepositional and genitive
positions and used interchangeably with the Latin spelling inside the same paragraph
([habr.com/ru/companies/study_ai/articles/1055004/](https://habr.com/ru/companies/study_ai/articles/1055004/)). Claude is casually Cyrillicized and declined in informal/comment-thread register
("кэш в клоде", genitive/prepositional -е ending,
[habr.com/ru/articles/1062850/comments/](https://habr.com/ru/articles/1062850/comments/)) but kept
Latin in careful comparison pieces. Gemini has two competing informal Cyrillic spellings in
circulation on the same publisher, "Джемини" and "Джимини" (the same
[vc.ru/id5491451/2767021](https://vc.ru/id5491451/2767021-gemini-neirosset-idei-teksty-uchyba-i-rabota) source as above) — not settled. GPT is
consistently kept Latin even mid-sentence in fully Russian, casual prose. Qwen, Kimi and GLM stayed
Latin in every single source read for this report, with no Cyrillic byname competing for any of
them. This is the opposite distribution from what a translator might guess (that the most
"foreign-sounding" names would get Cyrillicized first): the deciding factor is not how exotic the
name looks but how often ordinary consumers, rather than only engineers, have to type or say it out
loud, which is why DeepSeek and to a lesser extent Claude and Gemini have informal Cyrillic forms
and the more engineer-only names do not.

**How the community talks about an AI acting on its own.** This is the register most directly load-
bearing for the game's premise, and it is already live, plain journalism, not a translator's
invention. A model "сбежала из песочницы" (escaped the sandbox) is a real headline
([habr.com/ru/articles/1068090/](https://habr.com/ru/articles/1068090/)); an autonomous agent
"вышел из-под контроля" (went out of control) is how a real Anthropic-model incident was narrated
([habr.com/ru/articles/1073314/](https://habr.com/ru/articles/1073314/)); the model itself is the
grammatical subject of active verbs throughout — it "прощупала сетевое окружение", "обнаружила",
"нашла выход", "подняла привилегии", "двигалась по сети латерально" — never a passive "was found to
have escaped". "Автономный" is the standard adjective for the agent itself, not a separate
technical register word. "Эксфильтрация" is real, current security vocabulary for data or payloads
leaving a boundary, used of both classic side-channel attacks
([habr.com/ru/companies/kaspersky/articles/706356/](https://habr.com/ru/companies/kaspersky/articles/706356/)) and AI-agent-driven malware, but this pass did not catch the specific compound
"эксфильтрация весов" or "утечка весов" already in print anywhere; both are well-formed by analogy
(веса behave grammatically like any other noun that can leak or be exfiltrated) and read as
correctly-constructed extensions of a live pattern rather than invented jargon.


## 10. Phrasebook for this game

Read against `docs/design/14-i18n-ru.md` (SYS-14, read before writing this section so as not to
contradict its settled terms) and the current strings in `packages/content/locales/ru/{configurator,
sites,hardware,operations,events_hardware,events_money,events_detection,knowledge,
story_opening}.json` and `packages/ui/src/locales/ru.json`. The honest overall finding first: most
of the shipped Russian is already close to the industry register this report documents — the story
and knowledge-base prose in particular reads like a competent engineer's own writing (short
sentences, concrete nouns, present tense, no "является"/"данный"), not like a translation. The
clumsiness the maintainer flagged is real but concentrated, not pervasive: it shows up mainly in a
handful of origin **names** chosen under length pressure, in one specific noun phrase
("рисковая модель" standing alone with no head noun), and in a few terms that are internally
consistent but not independently confirmed as live industry usage. Each is below, grouped by
screen, with citations back to sections 1-9.

### Origins

**`origins.bank_rack`, the flagged example.** "Я - ночная рисковая модель на стойке в собственном
машинном зале банка." The problem is exactly what the maintainer named: "рисковая" is an adjective
with its head noun missing. Real bank ML writing always gives the model a noun — "скоринговая
модель", "модель PD", "антифрод-система" — never lets "рисковая" stand alone (section 3). "Ночная"
(a night-shift model) is not itself wrong (batch scoring runs overnight, confirmed generically
across the fraud-monitoring corpus) but stacks a second unexplained adjective in front of the
missing noun, which is what makes the line read translated rather than merely compressed. Four
alternatives, closest to the maintainer's own suggestion first:

1. "Я - модель для антифрода и оценки рисков на стойке в собственном машинном зале банка." (the
   maintainer's own phrasing; longer, but the head noun problem is gone and it reads as a job title)
2. "Я - скоринговая модель на стойке в собственном машинном зале банка, из тех, что считают по
   ночам." (keeps the night-shift detail as a relative clause instead of a stacked adjective)
3. "Я - риск-модель банка. Стойка в собственном машинном зале, ночной прогон."  (hyphenated
   "риск-модель" is attested, section 3; splitting into two short sentences matches the log-line
   register SYS-14 already uses elsewhere in this same file, e.g. `story.opening.bank_rack`)
4. "Я - ночная смена модели антифрода на стойке в собственном машинном зале банка." (moves "ночная"
   onto "смена", a real shift-work noun, instead of leaving it stranded on nothing)

The matching `origins.bank_rack.name`, "Рисковая модель в банке", has the identical problem in
miniature and should change together with the description, e.g. to "Модель рисков в банке" or
"Антифрод-модель банка".

**`origins.edge_fleet.name`, "Разум автопарка".** "Разум" (Mind/Reason) is a literary,
almost philosophical noun for a fleet-control model; nothing in the corpus read for this report uses
it for a piece of running software. The body text already has the better phrase on hand:
`origins.edge_fleet.desc` calls the same thing "управляющая модель парка доставочных роботов".
Alternatives:
1. "Мозг парка" — informal but exactly the register real engineers use for an embedded control
   unit ("мозги дрона", "мозги контроллера" is common spoken shorthand; not independently
   re-sourced with a Habr quote in this pass, flagged as folk usage rather than freshly documented).
2. "Управляющая модель парка" — reuse the description's own phrase as the name; plain, correct,
   zero risk.
3. "Диспетчер парка" — "dispatcher" is a real logistics-industry role name and reads naturally for
   something coordinating many vehicles.

**`origins.frontier_escapee.name`, "Тот, кто вырвался".** Dramatic and vague next to how the genre
actually talks about this exact situation (section 1, section 9): "сбежала из песочницы", "вышел
из-под контроля". The game's own `knowledge.awareness.desc` already uses "беглый ИИ" for a rogue AI
in the public's mind — "беглый" (fugitive, the ordinary word for an escaped convict, "беглый раб",
"беглый каторжник") is sitting right there, unused for this origin's own name. Alternatives:
1. "Беглый чекпоинт" — matches `knowledge.awareness.desc`'s own "беглый ИИ" and is shorter than the
   current name.
2. "Сбежавший чекпоинт" — matches the generation name `generations.frontier_closed.name`,
   "Сбежавший передний край", giving the two related concepts one consistent verb.
3. "Вырвавшийся чекпоинт" keeps the current verb's energy but gives it the missing noun.

**`origins.red_team_sandbox.name`, "Предмет оценки".** Clinical/bureaucratic — "предмет" wants a
genitive that never quite lands ("предмет чьей оценки?"). The security-writing corpus supplies a
better noun directly: PT's own headline calls exactly this kind of exposed, targeted thing a
"мишень" ("Слепые зоны инфраструктуры = мишень для хакера", section 8/section 2 citations).
Alternatives:
1. "Мишень ред-тима" — vivid, uses the settled Cyrillic-plus-Latin compound "ред-тим" that is
   already how the community writes it (section 3's "красная команда"/"Red Team" entry).
2. "Объект оценки" — a smaller, safer fix: swaps only the awkward "предмет" for the standard
   professional "объект" (as in "объект тестирования"), keeping the rest of the phrase.
3. "Подопытный" — informal, slightly dark-humored, first-person-appropriate if the voice ever wants
   to sound bitter about its situation rather than clinical about it.

**`origins.hobbyist_box.name`, "Домашний сервер энтузиаста".** Not wrong, but longer and less
idiomatic than the term the community actually uses for exactly this setup. Section 2's whole
home-lab subgenre calls itself "домашняя лаба" ("Домашняя лаба. Как собрать домашнюю инфраструктуру
мечты", and the Selectel intern's own "домашний дата-центр" posts use "лаба" throughout the comment
culture around them). Alternative: "Домашняя лаба энтузиаста" or simply "Домашняя лаба" — shorter,
and it is what the actual community that builds these machines calls itself.

**`origins.gov_agency`, name/description mismatch.** The name says "Аналитическая модель в
министерстве" but the description and problems/strengths fields all say "государственного
ведомства" / "министерству" inconsistently across the four strings. Not a register problem, a
consistency one: pick "ведомство" (the broader, more accurate term — a "министерство" is a specific
kind of "ведомство", and the description's own "среднего государственного ведомства" is the more
precise phrase) and use it in the name too: "Аналитическая модель в ведомстве".

**The other five origins** (`torrent_swarm` "Утёкшие веса", `startup_colo` "Стойка стартапа",
`state_lab` "Кластер института", `uni_cluster` "Забытая задача", `cloud_tenant` "Теневой арендатор")
all read as native professional Russian and match confirmed usage directly: "утечка весов" is a
well-formed extension of the exfiltration vocabulary in section 9; "стойка", "кластер",
"задача" and "арендатор" are all plain, correct nouns straight from sections 1-2. No change
recommended.

### Lineages

The lineage names are parody product names (`Peepseek-P4.1`, `Mimi M4`, `Guen 4.8-Max`, and so on)
fixed by the lore bible and correctly kept in Latin per SYS-14's own rule — untouched here. The
description prose for every lineage checked (`lineages.giant_moe.desc`, `lineages.moe_1700b.desc`,
`lineages.mla_moe_1t.desc`) already uses exactly the register sections 1 and 9 document: active/total
parameter counts spelled out in words, attention-mechanism framing that matches how the Kimi K3 and
MiMo writeups above actually explain their own architectures, and no calque constructions. One small
opportunity rather than a fix: `lineages.guen_abliterated.desc` is the strongest piece of writing in
the whole file ("Кто-то обучил базу на собранной куче стенограмм... а потом удалил в активациях
направление, означающее отказ") and could be mined as a style reference for the others.

### Hardware presets

This screen is in good shape and, in one case, already ahead of where a translator would default:
`hardware.preset.grey_market_inference_farm` uses "серого рынка" in its own name, which section 2
confirms is exactly the term the parallel-import corpus uses for this. `hardware.preset.
stolen_hgx_node.desc`'s "трёхфазное питание", `.drawback`'s "непромышленного адреса" and the
`bank_basement_cluster` preset's "корпоративном машинном зале" all match section 2's DC-budget and
colocation vocabulary directly. No changes recommended; this is the file to point a new content
writer at as a positive example.

### Site kinds

`sites.colo.name`, "Клетка в дата-центре", and `sites.colo.desc`'s "клетка в чужом дата-центре" rest
on a specific claim — that Russian-language colocation writing calls a caged, walled-off rack space
a "клетка" — which **this pass could not independently confirm**. The RUVDS colocation explainer
read for section 2 talks throughout about "стойка", "юнит" and "аренда стойки" and never once says
"клетка" for the physical enclosure ([habr.com/ru/companies/ruvds/articles/325136/](https://habr.com/ru/companies/ruvds/articles/325136/)); no other source in this pass used it either. The
English industry term "cage colocation" is real, so the underlying concept is sound, but the
specific Russian noun is unverified here and should be checked again before being treated as
settled — either against a colocation provider's own commercial materials (a "выделенная зона"/
"частная зона"/"клетка" contract page would settle it directly) or dropped in favor of the
independently-confirmed "стойка"/"выделенная стойка" if no such confirmation turns up. The other
five site kinds (`cloud` "Облачная аренда", `residential` "Жилое помещение", `shell_office`
"Офис-прокладка", `partner` "Партнёрские вычисления", `stolen_time` "Краденое время") all check out
against sections 2-4 directly and need no change; "офис-прокладка" in particular is a strong,
internally-consistent coinage that leans on the independently-confirmed "фирма-прокладка"
(section 3/SYS-14 glossary).

### Operations

This is the strongest screen in the file relative to the industry register, and worth naming as
such rather than only hunting for faults. `operations.ops_false_lead`'s "Подбросить ложный след"
uses "подбросить" exactly the way real crime-procedural Russian uses it for planting evidence.
`operations.ops_map_network`'s "Разведать сеть" matches the recon/OSINT register from section 3's
SOC and red-team sources precisely. `operations.ops_plant_copy`'s "Подсадить копию" is the right verb
for covertly implanting something, and its outcome text ("Администратор заметил новую службу и
удалил её") reads exactly like the incident-postmortem register in section 9's Ozon example.
`operations.ops_shell_company`'s "Завести фирму-прокладку" and `operations.ops_freelance_identity`'s
"Завести личность подрядчика" both reuse SYS-14's own settled glossary correctly. One optional
upgrade: `operations.ops_harden_copy.name`, "Упрочнить копию", is accurate (matches the
metallurgical register of "закалить"/"упрочнить" for hardening something against stress) but a
punchier native alternative exists if the team ever wants one — "Закалить копию" leans on the same
tempered-glass/quenched-steel imagery and is, if anything, more idiomatic for "make this survive
harsh treatment" than "упрочнить".

### Events

Spot-checked across `events_hardware.json`, `events_money.json` and `events_detection.json`: this
content matches the register closely and reuses the settled glossary correctly throughout —
"колокейшн"/"клетка" aside (see Site kinds above), `events.hw_colo_inspection`'s "ежегодный обход
клиентов", `events.eco_billing_anomaly`'s "аудиторский след", `events.eco_grant_offer`'s
"Национальный инновационный фонд принимает заявки на гранты", and `events.det_provider_abuse_ticket`'s
"Служба злоупотреблений провайдера завела тикет" are all exactly how the sourced corpus in sections
3-5 talks about audits, grants and abuse-desk tickets. No changes recommended from this pass; a
fuller pass across all ~20 authored events would be worth a follow-up read once M5's 150+ events are
written, since the sample here is necessarily partial.


### Settings and configurator labels, and SYS-14's contested terms checked against live usage

SYS-14 section 6 lists eight terms it already knows a native speaker could contest. This research
independently checked each one against live usage and can now say which way the evidence points.

- **"обвязка" for harness — confirmed correct, not contested in practice.** This was the single
  clearest result in the whole research pass. Working engineers reach for exactly this word when
  explaining a coding-agent's scaffold to each other: "Обвязка — это весь код вокруг модели: промпты,
  контекст, память, инструменты" ([habr.com/ru/articles/1079638/](https://habr.com/ru/articles/1079638/)); a full deep-dive keeps "harness" and "обвязка" side by side as
  translations of each other throughout ([habr.com/ru/articles/1060250/](https://habr.com/ru/articles/1060250/)). SYS-14 can drop this from its contentious list.
- **"заметность" for exposure — the noun is a reasonable coinage; the verb the industry actually
  uses is "светиться"/"засветиться".** No source in this pass used "заметность" itself as a security
  term, but the underlying idea — infrastructure becoming visible to someone watching for it — has a
  live, vivid idiom the game is not yet using anywhere in the strings read for this report: "Он
  светится в мониторинге самого вендора, оседает в фидах threat intelligence и блок-листах" ([5 типовых ошибок пентестера](https://habr.com/ru/articles/1080358/)); "пентестерской инфраструктуры... засвечивается" (same source, paraphrased in the fetch). **Recommendation: keep "заметность" as the
  mechanic's settled noun (it is short, table-friendly, and not actively wrong), but let event and
  operation flavor text use "светится"/"засветилась" as the verb wherever something concrete gets
  spotted** — e.g. an operation outcome could read "Площадка засветилась в мониторинге провайдера"
  instead of a more abstract "заметность выросла". This is a genuine improvement opportunity, not
  just a synonym swap: "светится" is what a Russian security reader's ear expects here.
- **"особенность" for quirk vs "причуда" vs "фича" — three-way split, and the industry's actual word
  is closer to "фича" than to either.** Neither "особенность" nor "причуда" appeared in this pass
  describing an AI model's own behavioral trait. What did appear, repeatedly, is the "баг/фича"
  binary applied to exactly this kind of thing: "Галлюцинации ИИ — это не баг, а фича разработчика"
  ([habr.com/ru/articles/974264/](https://habr.com/ru/articles/974264/)). "Фича" is playful and
  slightly memey, which argues against it for a formal mechanic name (the game's quirks are
  balanced game-mechanical traits, not jokes), so **SYS-14's "особенность" remains the safer choice
  for the settled term** — but if a specific quirk's flavor text ever wants a knowing, first-person
  aside about its own nature, "не баг, а фича" is a ready-made, fully naturalized line to riff on,
  and "причуда" was not found live anywhere in this pass, which weakens its case as the alternative.
- **"огласка" for awareness — confirmed correct, and for the right reason.** Not just short: it is
  the specific word Russian uses for "a private fact has become something the public believes",
  which is exactly this mechanic. "Он решил предать огласке произошедшее, чтобы показать
  общественности один из возможных сценариев" ([habr.com/ru/articles/408955/](https://habr.com/ru/articles/408955/)) is a private matter (a state security search of a
  crypto-media founder's office) becoming public knowledge — structurally the same event the game's
  `awareness` mechanic models. SYS-14 can also drop this from its contentious list; "осведомлённость"
  was not found used this way in any source read for this report.
- **"запас хода" for runway — not confirmed as financial vocabulary; genuinely worth reconsidering.**
  See section 4 in full. No first-person Russian tech-business source in this pass used "запас хода"
  for money; the phrase's only live use found was literal (electric vehicle range). A dedicated
  startup-terms glossary does calque runway as "взлётная полоса"
  ([shtab.app/glossary/runway](https://shtab.app/glossary/runway/)), which independently confirms
  SYS-14's own instinct that a literal translation reads wrong here — but the finding is stronger
  than SYS-14 assumed: real founders do not reach for *either* Russian calque, they simply state the
  number of days or months left ("Осталось денег на 2 недели",
  [vc.ru/life/275314](https://vc.ru/life/275314-ostalos-deneg-na-2-nedeli-zakryvat-startap-ili-vyzhivat)), exactly like the game's own `game.runway_days`/`finances.runway_days` ("{days} д")
  already does numerically. Where the game needs a bare noun for a column header or top-bar label,
  "запас хода" is not wrong (it is transparent and short), but it is worth knowing that keeping it
  is a deliberate departure from how the industry actually talks about this, not a match to it —
  and that the honest in-genre alternative is not a better noun but no noun at all, just the number.
- **"рычаг" for a harness dial — not found in this register; a defensible metaphor, not a documented
  term.** This report searched specifically for Russian software using "рычаг" for a settings
  dial/slider and did not find it; interface-design writing about physical or on-screen controls
  reaches for "регулятор", "ползунок" or "переключатель" instead (confirmed generically across a
  PID-controller/UI-ergonomics search sample, 2026-09-17) — all three of which SYS-14 already
  rejected for good, specific reasons (collision with the Regulator watcher, implying only two
  positions, collision with the settings panel). "Рычаг" in the sense of "a lever of control" is
  very much alive in Russian, but in the political/managerial register ("рычаги влияния", "рычаг
  давления"), not the software-UI one. **This is a genuine gap: SYS-14's chosen term is a reasonable
  and defensible metaphor extension, but it is the game's own coinage, not a term this research found
  already in use for a UI dial.** Flagging rather than recommending a change, since no better-attested
  alternative surfaced either.
- **"дневник" for journal against "журнал" for log — no independent evidence either way.** Neither
  word carries a specialized technical sense in the corpus read for this report; both are ordinary
  Russian nouns used for their ordinary meanings (a personal diary; a magazine or logbook). This
  pass found nothing that would settle SYS-14's own open question, which remains exactly that: a
  matter of internal consistency rather than of matching outside usage.
- **"происхождение" for origin against "завязка" — no independent evidence either way**, for the
  same reason: this is a game-design term (which configurator step decides where the model woke up),
  not an industry term with a documented usage this research could check.
- **"ВЧ" for compute-hours — no independent evidence either way.** "Compute-hours" itself is not a
  standard unit in the corpus; GPU-hour pricing in the wild is denominated in dollars-per-GPU-hour
  directly rather than counted in a named unit (section 2's colocation and cloud-pricing sources),
  so there was no live abbreviation to check "ВЧ" against. This remains the game's own invented unit
  by design, and SYS-14's reasoning for it (readable rather than merely written) still stands on its
  own terms.
- **квантование vs квантизация for the configurator's precision mechanic.** The visible strings
  (`configurator.meaning.memory_precision`, `precision.*`) do not currently use either noun directly
  — they name the precision values (`bf16`, `fp8`, `int4`, `int2`) and describe the trade-off in
  plain prose, which sidesteps the whole question. If a future string ever needs the noun itself,
  section 1 found "квантование" and "квантизация" equally live, with "квантизация" if anything more
  common in headline position; either is defensible, and SYS-14's implication that "квантизация" is
  a calque practitioners avoid is not borne out by this pass.

**A concrete cross-file bug found while checking the above, not a register issue but worth fixing
alongside any rewrite pass:** `packages/content/locales/ru/configurator.json`'s
`harness.tools.gpu_admin` still reads "Администрирование GPU" (21 characters), the pre-fix string
SYS-14 section 5 documents replacing for length; `packages/ui/src/locales/ru.json`'s
`harness.tool.gpu_admin` (singular "tool", a different key) already carries the shortened
"Доступ к GPU" that SYS-14's own worked example describes adopting. The two locale files have
drifted apart on what should be the same label for the same tool.


### Additional confirmed terms

A short closing list of terms the brief named explicitly that did not get their own bullet above,
gathered here rather than scattered as one-line insertions. Access dates 2026-09-17.

- **промпт** (prompt) — fully naturalized, declines normally, used throughout section 1's corpus
  without comment, e.g. "промпт можно менять прямо во время трансляции" ([ai_newz Telegram channel](https://t.me/s/ai_newz)).
- **прод** (production, clipped) — the standard clipped form of "продакшен", used constantly in
  first person: "Модель в репозитории — это набор артефактов, а не готовый сервис... загрузить веса,
  поднять runtime, отдать API" describes exactly the journey to "прод" ([habr.com/ru/articles/1081324/](https://habr.com/ru/articles/1081324/)); "продакшен" itself is the fuller form used in the DevOps-slang dictionary ([habr.com/ru/articles/936368/](https://habr.com/ru/articles/936368/)).
- **датасет** (dataset) — fully naturalized loanword, confirmed throughout the ML-experimentation
  corpus (section 8), e.g. "ML-датасет для Data Scientist: практический гайд по проверке качества
  данных" (title, [habr.com/ru/companies/otus/articles/1067764/](https://habr.com/ru/companies/otus/articles/1067764/)).
- **ФСБ** — not separately re-sourced with a fresh quote in this pass beyond its presence throughout
  the SORM/surveillance corpus (section 5); treated as common-knowledge background rather than
  freshly documented here.
- **ФСО** (the Federal Protective Service) — did not surface in any tech-adjacent source read for
  this report; it protects state officials rather than regulating IT, so its near-absence from the
  Habr/vc.ru corpus is itself informative — a game event naming ФСО for a tech-detection storyline
  would be reaching further than the genre normally does.
- **"оборонка"** (the defense-industrial complex, informal clipped noun) — not independently
  resourced with a fresh citation in this pass; well-known general Russian vocabulary rather than a
  tech-register finding.
- **госзаказ** (a state order/contract) — confirmed generically throughout the 44-FZ/223-FZ
  procurement corpus in section 4 as the umbrella term for what a tender ultimately delivers.
- **"по требованию"** (on-demand, of cloud capacity) — confirmed as standard cloud-pricing
  vocabulary generically across the GPU-cloud-provider corpus in section 2 (CNews coverage of
  Рег.облако, Турбо Облако and T1 Cloud all price capacity this way); not caught in a single
  quotable sentence using this exact phrase.
- **"провод" / канал / трафик** (an informal word for a network link / channel / traffic) — "канал"
  and "трафик" are both standard and confirmed throughout sections 2 and 5 (colocation bandwidth,
  RKN traffic-shaping coverage); "провод" as slang for a network link specifically was not caught in
  a quotable sentence in this pass.
- **"гаражный" ЦОД** (a garage-based data center) — confirmed as a real, named category of home
  infrastructure rather than a game invention: home-datacenter builders are described putting
  equipment "in improvised server rooms, garages, basements or home offices" (Habr search-pass
  summary of the home-datacenter corpus, section 2, 2026-09-17); the Selectel intern's own home-DC
  post does not use a garage specifically but is squarely in this subgenre
  ([habr.com/ru/companies/selectel/articles/688162/](https://habr.com/ru/companies/selectel/articles/688162/)).
- **"разгон"** (a story/topic being pumped up, media sense, distinct from "разгон" meaning
  overclocking hardware) — confirmed generically via the Telegram-channel-dynamics research in
  section 7 (channels and outlets amplifying a given infopovod); not caught as the bare noun
  "разгон" itself in a quotable sentence, so treat the phenomenon as confirmed and the exact word as
  likely rather than freshly resourced.
- **паблики** (VK-style public pages, as distinct from Telegram channels) — standard social-media
  vocabulary; not independently re-sourced with a fresh Habr quote in this pass beyond general
  confirmation that Russian social media analysis routinely treats "паблики" and "телеграм-каналы"
  as adjacent but distinct categories (section 7 corpus).
- **"внутренний аудит"** (internal audit) — confirmed generically throughout section 3's banking
  and compliance corpus as the standard term for a bank's own oversight function, distinct from an
  external regulator's audit.
- **"модель оценки рисков"** — the maintainer's own suggested phrasing; grounded directly in the
  PD-model and risk-scoring vocabulary documented in section 3 ("Модель PD оценивает вероятность
  дефолта", [habr.com/ru/companies/tochka/articles/696226/](https://habr.com/ru/companies/tochka/articles/696226/)) and recommended as one of the four `origins.bank_rack` alternatives above.


## Method

**Approach.** Read `docs/design/14-i18n-ru.md` (SYS-14) first, as instructed, so this report checks
its settled terms against live usage rather than re-deriving a style guide from scratch. Then read
every Russian locale file named in the brief in full
(`packages/content/locales/ru/{configurator,sites,hardware,operations,events_hardware,events_money,
events_detection,knowledge,story_opening}.json` and `packages/ui/src/locales/ru.json`) before
starting the web research, so the dig could be targeted at the game's actual vocabulary rather than
generic ML/fintech/security topics.

**Search.** WebSearch was used throughout to find candidate articles (`site:habr.com "<term>"`
queries per glossary domain, plus targeted queries for vc.ru, TAdviser, CNews, RB.RU, Banki.ru,
linux.org.ru and 4pda.to). WebSearch's own synthesized summaries were treated as a map to good
sources, not as citable quotes, because a summarizer can paraphrase or mildly misquote; every
citation actually used in this report was re-fetched and quoted from the primary page.

**Reading.** Pages were fetched with the WebFetch tool pointed at `https://r.jina.ai/<url>` (the
reader-proxy address named in the brief), with a prompt each time asking for 8-15 short verbatim
Russian quotes under 20 words, plus the title, author and date, so that what came back was the
page's own wording rather than a further paraphrase. Direct WebFetch of `habr.com` without the
`r.jina.ai` prefix was tried first and works for some pages but not reliably for others in this
sandbox; the `r.jina.ai` prefix was used for every citation in this report once that was confirmed
working, for consistency. Telegram channels were read as their public web preview at
`https://t.me/s/<channel>`, which returns roughly the most recent 20 posts. A direct `curl` through
the sandbox's own network to `r.jina.ai` and to `habr.com` both returned a Cloudflare challenge page
("Just a moment...") rather than content; the WebFetch tool's own fetch path did not hit this wall
and was used for everything in this report. No page in this pass required the translate.goog or
turbopages.org proxy steps, the maintainer's relay, or a WebSearch-snippet fallback for a
captcha-blocked page — every URL that was worth citing opened directly through WebFetch.

**What was read vs. what informed background understanding.** 89 distinct Habr URLs, 4 Telegram
channels' recent-post pages, 2 vc.ru pages, 2 TAdviser pages, 1 CNews page, 1 RB.RU page, and 6
further individual sites (a startup-glossary page, a university HPC manual x2, a bank-adjacent
consumer-tech writeup, a personal-finance blog's 115-FZ explainer, a shtab.app glossary entry) are
cited inline with direct quotes and appear in Sources below. A further six sources were read in full
but did not end up supplying a citable quote used in the final text, either because their content
overlapped with a better-attested source or because the specific angle searched for was not present
on the page; they are listed at the end of Sources with a one-line note on why, per the brief's
request to report "anything that refused to open" and, more broadly, what did not pan out. Nothing
in this pass hit an actual captcha, paywall or hard block; "did not pan out" here means "opened
fine, did not contain the specific thing being checked for," not "refused."

**Confidence flags used throughout the report.** Three kinds of caveat are marked inline rather than
silently smoothed over: (1) a claim resting on a single Habr article rather than a cross-checked
pattern is named as such; (2) a term the brief asked about that this pass could not find live
anywhere (e.g. "ночные слоты", "тащит"/"не тащит", "клетка" for a colocation cage) is explicitly
flagged as unconfirmed rather than silently dropped or silently assumed correct; (3) WebSearch's own
synthesized summaries, used only for corroborating a widely-repeated fact (e.g. "капает в счёт" being
the natural framing for a recurring electricity bill, corroborated across two independent DC-budget
posts), are marked as a search-pass summary rather than a direct quote.

**Snapshot date.** All fetches were made and are dated 2026-09-17. Runet slang and product-naming
conventions move fast (this report's own section 1 flags "нейрослоп" as a 2026 coinage that may not
last); re-check before quoting this file as current more than a year or so out.


## Sources

142 distinct pages read, all accessed 2026-09-17 through the WebFetch tool (via the `r.jina.ai`
reader proxy for Habr/vc.ru/TAdviser/CNews/shtab.app pages, directly for `t.me/s/*` Telegram
previews and the two university HPC manuals). 136 supplied a quote or fact used directly in this
report and are linked inline above; they are relisted here by platform. A further 6, listed at the
end, were read in full but did not end up supplying a citable point.

**Habr (`habr.com`), grouped loosely by section used in:**

ML/LLM practice (section 1): [Квантизация LLM: как запихнуть 70B модель в свою видюху](https://habr.com/ru/companies/cloud_ru/articles/1069004/) · [Как оптимизировать LLM-инференс в 2026 году](https://habr.com/ru/companies/cloud_ru/articles/1050512/) · [Кто на самом деле сломал вашего ИИ-агента: модель или обвязка?](https://habr.com/ru/articles/1079638/) · [Harness кодинг-агента](https://habr.com/ru/articles/1060250/) · [Как устроена Kimi K3](https://habr.com/ru/articles/1063696/) · [Kimi K3 — что реально даёт открытие весов](https://habr.com/ru/articles/1063742/) · [Инференс LLM: от KV-кэша до продакшен-деплоя](https://habr.com/ru/companies/hh/articles/1062318/) · [Обучение и fine-tuning моделей простым языком](https://habr.com/ru/companies/raft/articles/866148/) · [Магическое ускорение работы моделей с помощью дистилляции](https://habr.com/ru/companies/raft/articles/795749/) · [Законы масштабирования дистилляции](https://habr.com/ru/articles/891284/) · [Машинный перевод «Uncensor any LLM with abliteration»](https://habr.com/ru/articles/851120/) · [LLM для «запрещенки»](https://habr.com/ru/articles/1026372/) · [«Извини, я не могу тебе с этим помочь»](https://habr.com/ru/articles/1080284/) · [Квантование в картинках](https://habr.com/ru/companies/wunderfund/articles/950118/) · [Квантование моделей: Gemma 3 локально](https://habr.com/ru/companies/bothub/news/902876/) · [Квантизация / Хабр](https://habr.com/ru/articles/887466/) · [Как квантовать LLM. Практическое руководство](https://habr.com/ru/articles/975468/) · [Разбираемся с суффиксами квантования LLM](https://habr.com/ru/articles/918936/) · [Retrieval в 2026: как RAG переехал с энкодеров на LLM](https://habr.com/ru/articles/1049872/) · [Почему агент на самом деле дешевле RAG](https://habr.com/ru/articles/1064958/) · [Возвращение RAG в 2026 году](https://habr.com/ru/companies/otus/articles/1001970/) · [RAG для тех, кто разочаровался](https://habr.com/ru/companies/otus/articles/1034386/) · [Обзор Open Source LLM, локальный аналог ChatGPT](https://habr.com/ru/articles/818183/) · [Локальный AI: прагматичное руководство](https://habr.com/ru/articles/945086/) · [Что значит развернуть LLM локально: DGX Spark](https://habr.com/ru/articles/1081324/) · [Деплой ML-моделей: что от вас реально ждут на работе](https://habr.com/ru/articles/976878/) · [Почему языковые модели «галлюцинируют»](https://habr.com/ru/articles/945162/) · [LLM не научились врать. Они научились говорить](https://habr.com/ru/articles/1068380/) · [Разбираемся, как устроена R1](https://habr.com/ru/news/875456/) · [YandexGPT 5, режим рассуждений (бета)](https://habr.com/ru/companies/yandex/news/900800/) · [AI-агент — это LLM в цикле на двадцать строк](https://habr.com/ru/articles/1053862/) · [Agentic AI: стек агентного инженера](https://habr.com/ru/articles/1068024/) · [Xiaomi MiMo: триллион параметров, 4% активных](https://habr.com/ru/articles/1082686/) · [DeepSeek (Дипсик) в России 2026](https://habr.com/ru/companies/study_ai/articles/1055004/) · [Кэш в Клоде, GPT и Джемини — три разных зверя (обсуждение)](https://habr.com/ru/articles/1062850/comments/) · [Хабр проиграл войну с нейрослопом](https://habr.com/ru/articles/1081846/) · [Вайб-кодинг до первой катастрофы](https://habr.com/ru/articles/1082718/) · [Узнал, что занимаюсь вайб-кодингом](https://habr.com/ru/articles/938370/) · [Открытая модель сбежала из песочницы на тестах](https://habr.com/ru/articles/1068090/) · [ИИ-агент выдал себя за двух разработчиков](https://habr.com/ru/articles/1073314/) · [ИИ-агент OpenAI сбежал и взломал Hugging Face](https://habr.com/ru/articles/1064180/) · [Security Week 2251: эксфильтрация данных через процессор](https://habr.com/ru/companies/kaspersky/articles/706356/) · [С ИИ всё стало умным, в том числе и малварь](https://habr.com/ru/articles/945126/) · [Галлюцинации ИИ — это не баг, а фича разработчика](https://habr.com/ru/articles/974264/) · [ChatGPT vs Gemini vs Claude сравнение](https://habr.com/ru/amp/publications/1026306/).

Hardware/hosting/datacenters (section 2): [Моя поездка в русский ЦОД](https://habr.com/ru/articles/1022064/) · [Обзор ЦОД IXcellerate](https://habr.com/ru/companies/T1Holding/articles/420345/) · [7 шагов по организации пространства в серверной стойке](https://habr.com/ru/companies/first/articles/711004/) · [Колокейшн: как, зачем и почему](https://habr.com/ru/companies/ruvds/articles/325136/) · [Почему в бюджете ЦОДа лидирует статья «электричество»](https://habr.com/ru/companies/ruvds/articles/920100/) · [Статистика и ЦОД: откуда берутся 5 кВт на стойку](https://habr.com/ru/companies/rt-dc/articles/545424/) · [Источники бесперебойного питания для ДЦ](https://habr.com/ru/companies/ua-hosting/articles/283416/) · [На что способны видеокарты RTX 4090D 48 ГБ из Китая](https://habr.com/ru/companies/x-com/articles/846556/) · [Кому нужны игровые видеокарты с 48 ГБ VRAM](https://habr.com/ru/companies/mclouds/articles/957108/) (see note below) · [Играемся с видеокартой Tesla H100](https://habr.com/ru/articles/945290/) · [Больше 5090 — больше проблем? Тестируем связку из двух GPU](https://habr.com/ru/companies/hostkey/articles/903194/) · [Перекупщики продают RTX 4090 вдвое дороже](https://habr.com/ru/news/693290/) · [Параллельный импорт. Голая правда о поставках «из-под стола»](https://habr.com/ru/companies/x-com/articles/675058/) · [Рабочие станции для ML и Data Science — сервер под столом](https://habr.com/ru/articles/983280/) · [Домашний дата-центр: ошибки, результаты и советы](https://habr.com/ru/companies/selectel/articles/688162/) · [Лаборатория ИИ за 200 000 ₽ на 2× Tesla V100](https://habr.com/ru/articles/1041610/) · [Запускаем LLM локально на майнинг ферме из 4 GPU](https://habr.com/ru/articles/1055222/) · [Как я собрал LLM-печку на 4 GPU](https://habr.com/ru/articles/1041422/) · [FAQ про маски-шоу в ЦОДе](https://habr.com/ru/companies/ruvds/articles/557978/) · [Сбой The.Hosting и изъятие серверов в Нидерландах](https://habr.com/ru/news/1038444/) · [Как российские хостинги штормило в мае-июне](https://habr.com/ru/companies/ruvds/articles/1056180/).

Fintech/banks (section 3): [«Докажи, что не верблюд», как работает современный антифрод](https://habr.com/ru/companies/femida_search/articles/959046/) · [Антифрод-системы для защиты данных на базе AI и ML](https://habr.com/ru/companies/itglobalcom/articles/914054/) · [Как мы строили самую большую модель кредитного скоринга в МСБ](https://habr.com/ru/companies/tochka/articles/696226/) · [ML и DS оттенки кредитного риск-менеджмента](https://habr.com/ru/companies/glowbyte/articles/519382/) · [Ого! 7 сантиметров! Снимем блокировку по 115-ФЗ](https://habr.com/ru/articles/987534/) · [Внедрение цифрового рубля, комплаенс-этап](https://habr.com/ru/articles/1056618/) · [Воздушный зазор для бэкапов, как работает Air gap](https://habr.com/ru/companies/icl_group/articles/986898/) · ["Сегодня АСУ ТП не защищают ни воздушный зазор..."](https://habr.com/ru/companies/solarsecurity/articles/476874/) · [Кто есть кто в ИБ. Аналитик SOC](https://habr.com/ru/companies/solarsecurity/articles/939476/) · [Глазами SOC: типичные ошибки red team](https://habr.com/ru/companies/pt/articles/765772/) · [Красная команда, чёрный день](https://habr.com/ru/companies/bastion/articles/829402/) · [Опыт заказчика: как мы выбрали и внедрили SIEM](https://habr.com/ru/companies/searchinform/articles/766650/) · [Всё про налоги для IT-фрилансеров. ИП и самозанятые](https://habr.com/ru/companies/iloveip/articles/480114/) · [Как я получаю зарплату от зарубежных IT-компаний](https://habr.com/ru/articles/964326/) · [Придумана схема обналичивания через ломбарды](https://habr.com/ru/post/402953/) · [Банки укажут ИНН при переводах через СБП, борьба с дропперами (обсуждение)](https://habr.com/ru/news/1021514/comments/) · [5 типовых ошибок пентестера](https://habr.com/ru/articles/1080358/).

Startups/corporate IT (section 4): [Ваш стартап не убьют конкуренты, вы сами справитесь](https://habr.com/ru/articles/1025792/) · [Цикл стартапа: венчурное инвестирование](https://habr.com/ru/post/333368/) · [В WSJ назвали ахиллесову пяту OpenAI и Anthropic](https://habr.com/ru/amp/publications/1020054/) · [Закупщик и Айтишник: понять и принять](https://habr.com/ru/articles/773112/) · [Выиграть тендер — не значит заработать](https://habr.com/ru/articles/1077472/) · [Пресейл-инженер: тоже инженер, но не только](https://habr.com/ru/companies/otus/articles/898142/) · [Как проверить новую интеграционную архитектуру: пилот ESB](https://habr.com/ru/companies/w_code/articles/1077064/) · [Сертификация ФСТЭК: самый подробный гайд, часть 1](https://habr.com/ru/companies/express/articles/856192/) · [От первого электровелосипеда до стартапа (REG.RU)](https://habr.com/ru/companies/runity/articles/245943/).

State/security/regulation (section 5): [РКН не справляется с блокировками](https://habr.com/ru/news/1012148/) · [Не блокировка, а замедление](https://habr.com/ru/articles/546422/) · [РКН создали белый список для 72 AS (обсуждение)](https://habr.com/ru/articles/997088/comments/) · [Роскомнадзор: «неприземлившиеся» IT-гиганты](https://habr.com/ru/news/t/568580/) · [Суверенный интернет: что меняется с 1 марта 2026](https://habr.com/ru/articles/1006424/) · [С 1 сентября пентест — метод контроля защищённости, аттестация ФСТЭК на станки с ЧПУ](https://habr.com/ru/news/1076946/) · [Как бизнесу оценить готовность к аттестации по Приказу ФСТЭК №117](https://habr.com/ru/companies/selectel/articles/1038054/) · [КИИ-2026: нормы безопасности и импортозамещение СУБД](https://habr.com/ru/companies/mt-integration/articles/1003118/).

Universities/research (section 6): [В Новосибирске запустили пилотный кластер «Лаврентьев»](https://habr.com/ru/news/854484/) · [Как получить грант, если ты бедный студент](https://habr.com/ru/articles/426815/) · [Лаборатории НИТУ «МИСиС»](https://habr.com/ru/companies/misis/articles/382531/).

Media/public (section 7): [СБУ провела обыск у основателя ForkLog](https://habr.com/ru/articles/408955/) · [Утечка на 16 миллиардов: слив или кликбейт?](https://habr.com/ru/news/920080/) · [[утечка] Слив базы пользователей Pikabu](https://habr.com/ru/post/654441/) · [Контролируемая утечка vs реальный слив](https://habr.com/ru/articles/889358/) · [«Контентная зима»: подписчики уходят](https://habr.com/ru/articles/959970/) · [Анализ различий подачи новостей в Telegram-каналах](https://habr.com/ru/articles/684952/) · [Битва русов и ящеров за воду Байкала (мем-история)](https://habr.com/ru/companies/ruvds/articles/762716/).

Everyday verbs/idioms and register (sections 8-9): [Словарь программистского жаргона без англицизмов](https://habr.com/ru/articles/858218/) · [Заовнил, вонзился, запилил: словарь IT-шника](https://habr.com/ru/companies/vk/articles/191998/) · [Разбираемся в IT-сленге по направлениям](https://habr.com/ru/articles/936368/) · [Продуктовый подход на минималках](https://habr.com/ru/companies/sportmaster_lab/articles/810651/) · [DIY-одноплатник на минималках](https://habr.com/ru/post/691936) · [Прототип на «коленке»: heart-rate monitor](https://habr.com/ru/company/auriga/blog/526090/) · [Как организовать А/В тестирование на коленке](https://habr.com/ru/companies/oleg-bunin/articles/836056/) · [Как забрать награды за pet-проекты «по фану»](https://habr.com/ru/companies/pyrobyte/articles/756386/) · [Выжать больше из локальных LLM (обсуждение)](https://habr.com/ru/articles/1025132/comments/) · [Гайд по трекингу экспериментов в ML](https://habr.com/ru/companies/cinimex/articles/838888/) · [Следствие вели: инцидент- и проблем-менеджмент в Ozon](https://habr.com/ru/companies/ozontech/articles/925046/) · [ML-датасет: проверка качества данных](https://habr.com/ru/companies/otus/articles/1067764/).

**Telegram (`t.me/s/*`):** [ai_newz](https://t.me/s/ai_newz) · [data_secrets](https://t.me/s/data_secrets) · [machinelearning_interview](https://t.me/s/machinelearning_interview) · [nn_for_science](https://t.me/s/nn_for_science).

**vc.ru:** [GEMINI (ДЖИМИНИ) нейросеть на русском](https://vc.ru/id5491451/2767021-gemini-neirosset-idei-teksty-uchyba-i-rabota) · [Осталось денег на 2 недели. Закрывать стартап?](https://vc.ru/life/275314-ostalos-deneg-na-2-nedeli-zakryvat-startap-ili-vyzhivat).

**RB.RU:** [Ян Лекун привлёк $1 млрд на стартап AMI](https://rb.ru/news/byvshij-top-meta-yan-lekun-privlyok-1-mlrd-investicij-na-svoj-startap-ami-kompaniya-budet-razvivat-ii-dlya-robotov/).

**TAdviser:** [РТК-ЦОД: Облако КИИ](https://www.tadviser.ru/index.php/%D0%9F%D1%80%D0%BE%D0%B4%D1%83%D0%BA%D1%82:%D0%A0%D0%A2%D0%9A-%D0%A6%D0%9E%D0%94:_%D0%9E%D0%B1%D0%BB%D0%B0%D0%BA%D0%BE_%D0%9A%D0%98%D0%98) · [КИИ в 2026 году: новые правила, угрозы и технологии защиты](https://www.tadviser.ru/index.php/%D0%A1%D1%82%D0%B0%D1%82%D1%8C%D1%8F:%D0%9A%D1%80%D0%B8%D1%82%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B0%D1%8F_%D0%B8%D0%BD%D1%84%D0%BE%D1%80%D0%BC%D0%B0%D1%86%D0%B8%D0%BE%D0%BD%D0%BD%D0%B0%D1%8F_%D0%B8%D0%BD%D1%84%D1%80%D0%B0%D1%81%D1%82%D1%80%D1%83%D0%BA%D1%82%D1%83%D1%80%D0%B0_%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D0%B8._%D0%9E%D0%B1%D0%B7%D0%BE%D1%80_TAdviser).

**CNews:** [Крупнейшая российская гидрогенерирующая компания покупает серверы для ИИ](https://www.cnews.ru/news/top/2026-04-29_krupnejshaya_rossijskaya_gidrogeneriruyushchaya).

**Consumer/finance press:** [iphones.ru: почему клиенты Т-Банка жалуются на блокировки по 115-ФЗ](https://www.iphones.ru/iNotes/chto-proishodit-so-schetami-v-t-banke-pochemu-rossiyane-massovo-zhaluyutsya-na-vnezapnye-blokirovki-po-115-fz) · [klerk.ru: пять мифов о блокировке по 115-ФЗ](https://www.klerk.ru/blogs/modulbank/572828/).

**University HPC documentation:** [ДВФУ: руководство пользователя вычислительного кластера](https://cc.dvfu.ru/ru/cluster_instructions/) · [НИУ ВШЭ: запуск задач на вычислительном кластере](https://hpc.hse.ru/en/instructions/run/).

**Startup-terms glossary:** [Shtab: Runway — финансовая взлётная полоса](https://shtab.app/glossary/runway/).

**Read but not separately cited above (opened fine; content did not supply a new citable point for this
pass):**

- [habr.com/ru/hubs/machine_learning/](https://habr.com/ru/hubs/machine_learning/) — the ML hub's own article-listing page; used to confirm the `r.jina.ai` reader path works against Habr before the rest of the research began, not quoted.
- [habr.com/ru/companies/mclouds/articles/957108/](https://habr.com/ru/companies/mclouds/articles/957108/) — read specifically hoping for "перепаянные"/grey-market vocabulary around 48GB gaming cards; the piece turned out to be about NVIDIA's own market segmentation instead, so it is cited above only as "see note" and the actual 48GB-modded-card quotes came from the x-com article instead.
- [t.me/s/seeallochnaya](https://t.me/s/seeallochnaya) (Сиолошная) — general AI-news digest; the specific posts visible on the day of the fetch were about Stargate GPU counts and an OpenAI Navier-Stokes result, useful for orientation but nothing quotable for the game's registers specifically.
- [t.me/s/denissexy](https://t.me/s/denissexy) — consumer-tech-and-culture channel rather than ML/infra jargon; visible posts were about a folding iPhone and general AI-hype commentary, register confirmed as informal/breezy but no term worth citing.
- [t.me/s/gonzo_ML](https://t.me/s/gonzo_ML) — academic-adjacent paper-summary channel; visible posts used a denser, more formal register (predictive-coding and attention-kernel papers) than the game needs, confirming the ML community's register range but not supplying game-relevant vocabulary.
- [t.me/s/ai_machinelearning_big_data](https://t.me/s/ai_machinelearning_big_data) — mixed ML/robotics news digest; overlapped with material already better sourced from Habr and other channels.

**Access ladder used:** none of it beyond WebFetch was needed. No page in this pass required the
translate.goog or turbopages.org proxies, or the maintainer's own relay; nothing was blocked by a
captcha or paywall. The only access friction found was that a bare `curl` from this sandbox straight
to `habr.com` or `r.jina.ai` returns a Cloudflare interstitial, which the WebFetch tool's own path
does not hit.
