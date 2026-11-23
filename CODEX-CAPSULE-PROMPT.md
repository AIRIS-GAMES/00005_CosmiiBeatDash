# Codex への依頼：コスミーのカプセル（ガチャ）と着せかえ

あなたはこのリポジトリ（Cosmii Rhythm Dash：HTML5 + Capacitor の横スクロール・リズムゲーム）に、**ガチャ「コスミーのカプセル」と着せかえ（クローゼット）**を実装し、必要な画像を built-in image_gen で生成してください。

この作品は「ゲームを通じてキャラクターへの愛着が湧くか」を検証しています（PSF-ANALYTICS.md）。着せかえは、自分で選んだ見た目を通じてキャラを「自分のコスミー」にするためのものです。既存の「きずな」機能（cosmii-bond.js）とつなげることが、この依頼でいちばん大事な点です。

---

## 1. まず見るもの

| 見るもの | 何がわかるか |
|---|---|
| `prototypes/capsule-preview.html` | 動く試作。ブラウザで開いて操作できる（リポジトリのルートを配信して `/prototypes/capsule-preview.html` を開く）。ルール・画面の流れ・演出の基準はこれ。アイテムの絵は仮のSVG図形 |
| `prototypes/capsule-shots/*.jpg` | 試作の画面。machine（カプセル画面）、reveal（SR開封）、closet / closet2（着せかえ）、play（プレイ中とホームでの見え方） |
| `cosmii-bond.js` / `.css` | きずな（キャラごとのレベル）。`cosmiiBond.gain(i, xp)`、`cosmiiBond.level(i)`、プロフィールの `profileHtml(i)` |
| `cosmii-rides.js` | コインで買う「のりもの」。**購入の途中で落ちてもコインと所持状態を戻す journal 方式**をガチャでもそのまま使う。のりものはキャラ入りのスプライトシート（`Asset/world/rides/`） |
| `cosmii-character-motion.js`、`index.html` の `draw()` とプレイヤー描画 | キャラの描かれ方。通常画像 `Asset/world/cast-neon/{color}.png`、両手を上げた `{color}-hands.png`、走りの2×2シート `Asset/world/run/{color}.png` |
| `cosmii-world.js` の `profiles()`、`ui.js`、`cosmii-screens.css`、`cosmii-dialogs.css` | プロフィール・パネル・ダイアログの今のUI。見た目はここに合わせる |
| `Asset/world/cast-neon/PROMPTS.md`、`Asset/world/rides/PROMPTS.md` | 既存アートの生成プロンプトと絵柄の約束。画像はこれと同じ絵柄にする |
| `PSF-ANALYTICS.md` | 計測イベントの命名ルール（`BeatPSF:v1:`、5階層以下、各32文字以下） |
| `scripts/test-frame-cost.js` | 描画の禁止事項（下の「守ること」） |

キャラは5体、並びは `SKINS` の順：0 赤 red / 1 水色 blue / 2 ピンク pink / 3 黄緑 green / 4 紫 purple。

---

## 2. ガチャのルール（試作どおり）

- 名前は「コスミーのカプセル」。アーケードのカプセルトイ機。**ゲーム内コインだけ**で回す。本当のお金での購入は入れない。
- 1回 **100コイン**。**毎日1回無料**（ローカル日付で判定。日付が変わると復活）。
- 排出率 **N 70% / R 25% / SR 5%**。**10回以内に必ずSR**（天井。SRが出たら数え直し）。画面に「SR確定まで あと N 回」。
- 排出はキャラ共通のアイテム。**もう持っているアイテムが出たら、いま選んでいるキャラとの「きずな +10」に変える**（`cosmiiBond.gain(skinIdx, 10)`）。開封画面に「もう持っているので ○○とのきずな +10 に変わりました」。
- **「なかよしスカーフ」はガチャに入れない**。そのキャラのきずなが Lv5 になったときにもらえる限定品（そのキャラ専用）。
- 開封画面に「○○に着せる」と「もう1回」。着せるとクローゼットへ。
- 支払いと所持の保存は `cosmii-rides.js` と同じ journal 方式。保存に失敗したら、コインも所持も戻す。

### アイテム（13個。試作の `ITEMS` と同じ）

| id | 名前 | レア | 部位 |
|---|---|---|---|
| phones | ヘッドホン | N | 頭 |
| cap | ナイトキャップ | N | 頭 |
| glasses | まるメガネ | N | 顔 |
| scarf | しましまマフラー | N | 首 |
| star | スターヘアピン | N | 頭 |
| bow | おおきなリボン | R | 頭 |
| shades | ネオングラス | R | 顔 |
| neon | ネオンカラー | R | カラー |
| night | よぞらカラー | R | カラー |
| crown | スターかんむり | SR | 頭 |
| gold | ゴールドカラー | SR | カラー |
| halo | ネオンの輪 | SR | 頭 |
| bondscarf | なかよしスカーフ | SR（ガチャ外） | 首 |

- 部位は **頭・顔・首・カラー** の4つ。**各部位1つまで**組み合わせられる（頭にヘッドホン＋顔にメガネ＋首にマフラー＋ネオンカラー、など）。
- 着せかえは**キャラごと**に保存する。持ち物はキャラ共通。
- 見た目だけ。当たり判定・ジャンプ・キャラの能力は一切変えない。

---

## 3. 画面

- **入口**：ホームのキャラ欄に「のりもの」と並べて「きせかえ」ボタン。フッターにも「カプセル」を追加する（ほかのボタンとアイコンの見た目を合わせる）。無料の1回が残っている日は、ボタンに小さな印を出す。
- **カプセル画面**：試作の machine.jpg の構成（左にマシン、右に「CAPSULE」・天井の残り回数・「今日の無料 1回」・「100 で1回」）。回すと、ハンドルが回ってカプセルが転がり出て2回揺れ、開く。レアほど光の帯と色を強く（N 水色がかった灰／R シアン／SR 金）。
- **クローゼット**：試作の closet.jpg の構成（左に着せかえ中のキャラ、右にアイテムの一覧。持っていないものはシルエットと「？？？」、なかよしスカーフは「♥ きずなLv5」）。キャラの切り替えは既存のキャラ選択と同じ並び。
- **プロフィール**：着ている姿で表示し、「きせかえ」へのボタンを置く。
- 「演出を控えめに」（`window.reducedEffects`）では、カプセルの演出を短くし、光の帯を止める。

---

## 4. 着せかえの見え方（すべての場面に出す）

ホームの台座（`#charimg`）、プレイ中の走り、のりもの（スケボー・自転車）、両手を上げたポーズ（結果画面・ゴール・リアクション）、結果画面の `#clearchar`、プロフィール、まだいける！画面の `#rv-char`。

### 方式：アクセサリー画像を「取り付け位置」に重ねる

キャラ×アイテム×ポーズを全部描き起こすと枚数が爆発するので、**アクセサリーは単体の透過PNG**にして、キャラとポーズごとの取り付け位置（頭・顔・首の点と大きさ・角度）に重ねる。

- 取り付け位置はデータで持つ：`ANCHORS[color][pose] = { head:{x,y,scale,rot}, face:{...}, neck:{...} }`。pose は `front`（通常）、`hands`、`run0`〜`run3`、`skate0`〜`3`、`bike0`〜`3`。
- 値を合わせるための**調整用ページ**を作る（キャラとポーズを選び、ドラッグで位置を決めてJSONを書き出す）。5キャラ×全ポーズを、実際に合わせてから値を確定する。
- 向き：正面の画面（ホーム・結果・プロフィール）は**正面向き**のアクセサリー画像、走りとのりものは**右向き3/4**の画像を使う。だから各アイテムに2枚（`front` と `side`）を作る。
- カラー（ネオン・よぞら・ゴールド）は画像を作らず、色を変えたキャラ画像を**読み込み時に1度だけ**別キャンバスに作っておき、それを描く。

### 守ること（既存テストの約束）

- **毎フレーム `ctx.filter` を使わない**（test-frame-cost.js が失敗する）。色変えは上のとおり先に作っておく。
- **640px より大きい画像を毎フレーム描かない**。アクセサリーは表示サイズに合わせて読み込み時に縮小する。
- 音楽の再生要素は1つだけ（html-audio.js）。ガチャに効果音を付けるなら、既存の効果音のしくみを使う。
- 判定・物理・スコアは変えない。

---

## 5. 生成する画像（built-in image_gen）

保存先は `Asset/world/capsule/`。生成に使ったプロンプトと日付を `Asset/world/capsule/PROMPTS.md` に、既存の `rides/PROMPTS.md` と同じ書き方で残す。

### 共通の絵柄（既存のネオンキャラと同じ）

> Glossy clean HD game illustration matching the existing COSMII neon cast: thick smooth deep-plum/navy outline, saturated colors with soft cel shading, compact glossy highlights, subtle cyan rim light on the left and magenta reflection on the lower right. Not pixel art. No text, no labels, no frames, no shadows on the ground.

参照画像として `Asset/world/cast-neon/red.png`（と必要に応じてほかの4体）を渡し、絵柄と大きさの基準にする。

### 5-1. カプセルマシン

`machine.png`（透過、縦長、長辺 1024px）

> One arcade capsule-toy vending machine, front view, centered, on a truly transparent background. A big clear glass dome on top filled with round two-tone capsules (pastel blue-grey, cyan, gold and pink tops with white bottoms), a rounded magenta-pink cabinet below with a small star-shaped sign plate reading nothing (blank), a big round golden turning handle in the middle of the cabinet, and a dark capsule exit slot near the bottom. Cute rounded toy-like proportions that sit naturally next to the COSMII characters in a closed-at-night neon game center. [共通の絵柄]

ハンドルは回す演出のため、**本体とハンドルを別画像**にする（`machine.png` はハンドルなし、`machine-handle.png` はハンドルだけ）。

### 5-2. カプセル

`capsule-n.png` / `capsule-r.png` / `capsule-sr.png`（透過、正方形 512px）と、開いた状態の `capsule-open-*.png`

> One round two-tone toy capsule, front view, centered on a truly transparent background. Top half glossy translucent [pastel blue-grey | bright cyan | shining gold with tiny star sparkles], bottom half glossy white, thin seam line between. Simple, iconic, readable at small sizes. [共通の絵柄]

開いた状態は「上下に少し離れた2つの半球」。

### 5-3. アクセサリー（12個 × 正面と右向きの2枚）

`items/{id}-front.png`、`items/{id}-side.png`（透過、正方形 512px、アクセサリーだけ。キャラは描かない）

共通指示：

> Generate ONE wearable accessory ALONE for the COSMII character shown in the reference, on a truly transparent background. Do NOT draw the character. Draw the accessory at the size and angle it would be worn on the reference character's round head, [front view | facing screen RIGHT in three-quarter view], centered with generous margins. Keep it simple, chunky and toy-like, readable at 40px. [共通の絵柄]

アイテムごとの内容：

| id | 内容（英語でプロンプトに入れる） |
|---|---|
| phones | Chunky over-ear headphones: cyan headband with a magenta stripe, two round pink ear cups with tiny yellow stars, sized to wrap the round head. |
| cap | A floppy night cap: indigo-violet with a small white star pattern, white fluffy band, white pom-pom at the drooping tip. |
| glasses | Round thin-framed glasses in deep plum with light-blue glass reflections. |
| scarf | A short knitted scarf: orange with white stripes, one end hanging down the front. |
| star | One small yellow star hairpin with a glossy highlight. |
| bow | One big ribbon bow in hot pink with a lighter pink knot. |
| shades | Sleek neon sunglasses: dark lenses with a cyan neon rim and a magenta glint. |
| crown | A small cute crown: gold, five rounded points, a pink gem in the center and tiny star gems. |
| halo | A floating neon ring halo: white core with a pink-magenta glow, slightly tilted ellipse. |
| bondscarf | A soft pink scarf with a small white heart on its knot, one end hanging down. Premium, special feeling. |

カラー（neon / night / gold）は画像を作らず、4章のとおり色変えで作る。色の見本は試作の CSS（`.wear.glow` / `.wear.night` / `.wear.gold`）。

### 5-4. 画像の検品

- 透過が本当に抜けているか（端に背景色が残っていないか）。#FF00FF で生成して抜く場合は、rides と同じしきい値・最大連結成分だけ残す・端に触れたら作り直し。
- 5キャラ全員に重ねて、ずれ・はみ出し・顔の隠れすぎがないか。紫の角、ピンクの耳、黄緑の芽、水色のリボンとぶつかるときは、取り付け位置で調整する。
- 試作の画面（`prototypes/capsule-shots/`）と並べて、色とサイズ感が近いか。

---

## 6. 計測（PSF-ANALYTICS.md に追記）

`BeatPSF:v1:` に続けて、例：

- `capsule_open:home:{color}`：カプセル画面を開いた
- `capsule_pull:{free|coin}:{n|r|sr}`：回した（支払いと保存が成功したあとだけ）
- `capsule_dup:{color}:bond`：ダブりをきずなに変えた
- `skin_equip:{color}:{slot}`：着せかえた（{slot} は head/face/neck/color）

Resource Sink に `Coins / Capsule` も記録する。これらは関心反応（interest:profile / interest:sns）の分子には**入れない**。

---

## 7. 仕上げ

- 新しいファイルは `scripts/build-capacitor-www.js` の一覧と `sw.js` の `ASSETS` に追加し、`sw.js` の `CACHE` の版を上げる。
- `npm run web:build` のあと `www/` と `ios/App/App/public/` に反映する（このリポジトリは両方をコミットしている）。
- テスト `scripts/test-capsule.js` を追加し、`package.json` の `test` に入れる。最低限：
  - 無料1回 → 2回目は無料にならない／翌日（日付を進める）には戻る
  - 100コインで1回、コイン不足では回せない
  - 10回以内に必ずSR（乱数を固定して確認）
  - ダブりできずなが +10
  - 保存失敗時にコインと所持が戻る
  - 着せかえがホーム・プレイ中・結果・プロフィールで描かれる
  - test-frame-cost.js の条件（ctx.filter なし、640px超の画像なし）を満たす
- `npm test` がすべて通ることを確認する。
- 5キャラ × いくつかのアイテムの組み合わせで、ホーム・プレイ中・のりもの・結果・プロフィールのスクリーンショットを撮り、ずれがないかを目で確かめる。

## 8. 報告してほしいこと

- 生成した画像の一覧と、作り直した画像があればその理由
- 取り付け位置の調整で苦労した組み合わせと、その対処
- 試作から変えた点（あれば理由も）
- テストの結果
