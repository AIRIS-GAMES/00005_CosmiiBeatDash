# Beat Dash：PSF計測設定

更新：2026-11-07。ゲーム側の実装と送信直前の自動検証は完了。GameAnalytics管理画面への受信、実ユーザーの継続率・改善効果は未確認。

## 根拠と対象

正式資料：`PSF検証審査シート（AIRIS）.pptx` の6～9枚目を確認。
目標は1タイトル300DL（最低100）、D1 25%、D7 5%、キャラへの関心反応5%。資料にある広告発注・審査員への連絡等は実行していない。
旧 `PSF-IMPLEMENTATION-SPEC.md` は仕様案であり、今回の計測の実装詳細は本書を優先する。

## 接続・本番データへの混入防止

- 既存のGameAnalyticsゲームキーを引き継いだ。クライアントSDKの初期化・Resource/Progressionイベントも維持。
- 新ビルドは `web-psf-1.1.0` / `ios-psf-1.1.0`（capacitorスキーム）。新イベントは `BeatPSF:v1:`。旧 `Run:*` / `BeatWorld:v1:*` / `Social:*` と合算しない。
- SDK初期化で最初のセッションを開始。visibilitychange/pagehideでendSession、再表示でstartSessionを1回だけ呼ぶ。アプリを再読み込みせず翌日復帰した場合にもセッションを作る。ゲーム内ポーズはセッションを切らず、復帰をrun_startとして数えない。
- 公開WebとCapacitor版でSDK初期化。localhost / LANプレビューは既定OFF。開発中の通信で本番の人数を増やさない。
- `?analytics=off`、`?demo=...`、webdriverはSDK自体を読み込まない。localhost/LANで意図的に実送信する場合のみ `?analytics=on`。webdriverではonでも無効。
- 自動テストは外部通信を遮断し、メモリ内の `__beatAnalyticsSink` だけで検証。この収集先は無効環境限定。
- 例外はゲームを止めない。自由入力・生URL・個人情報・ローカルランIDはイベント名に含めない。全イベント5階層以下、各区分32文字以下。
- 新規/旧保存の判定は本SDK識別子ではなくローカル保存単位。計測追加前のステージ記録・購入等がある人は `legacy`。初回率に混ぜない。保存削除、別ブラウザ、複数タブの競合には限界がある。

## 主指標の集計

同じタイトル・ビルド・プラットフォーム・期間・タイムゾーンで集計する。

| 指標 | 取り方 |
|---|---|
| プレイUU（分母） | `BeatPSF:v1:run_start:*` を期間中に送ったSDKユーザーの重複除外人数。練習やタイトルだけの人は除外 |
| 関心UU（分子） | 上記プレイUUと、同期間の `BeatPSF:v1:interest:profile:*` または `BeatPSF:v1:interest:sns:*` のUU和集合との積集合 |
| 関心反応率 | 関心UU / プレイUU。目標5%。分母0では率を表示しない。イベント件数の合計や個別SNSのUUの単純合計を使わない |
| D1 / D7 | GameAnalyticsの初回起動コホートとセッションベースのRetention。目標25% / 5%。本番開始コホートと混同しない。D7を観察できたコホートだけで判定し、設定タイムゾーンと日付/経過日数の定義を記録する |
| DL・媒体別CPI | App Store Connect / 広告媒体のDL・支出から別管理。SDK新規ユーザー数やWeb起動をDL数と呼ばない |

GameAnalytics ExploreでDesign Eventのイベント名とUnique Usersを使う。イベント間のUU和集合・積集合が利用中の管理画面/プランで作れない場合、利用可能なユーザー単位Exportで同一匿名ユーザーIDを重複除外して計算する。**各イベントの集計UUを足して代用しない。** 集計できない期間は率を未算出とする。
SNSはリンク押下までの観測。実際のページ読了・フォロー・スタンプ購入・心理的愛着の成立は別の調査が必要。

## イベント辞書

以下はすべて `BeatPSF:v1:` に続く部分。基本の値は1。
`track` は `normal_s01`～`normal_s20` または `daily_daily`。キャラはred/blue/pink/green/purple。

| パターン | 意味 |
|---|---|
| `run_start:{track}:{first/retry/legacy}_{color}` | HTMLAudioのplay成功後に本番開始。初回・再試行を保存。ポーズ復帰・練習・再生拒否を除外 |
| `character_play:{color}:{normal/daily}` | 本番で使用したキャラ。関心主指標とは別 |
| `run_complete/run_fail/run_exit:{track}:{kind}_{color}` | 完走・衝突失敗・ホーム退出。各区間1回。退出は一時停止中も対象 |
| `run_resume:{track}:{color}` | 死亡後の復活。新しいrun_startにはしない。復活後の終端kindはresumed |
| `run_progress:{track}:{outcome}` | 終端時の進行度0～100。障害物追加後の離脱箇所の診断に使う |
| `run_background:{track}:{color}` | pagehide時にランが開いていた。強制終了・アプリ終了の配送は保証されず、失敗/退出に自動合算しない |
| `first_complete:{first/retry/resumed}:{color}` | 新規保存の最初の完走のみ。値は成功ランの曲内秒数。旧保存は送らない。過去失敗や練習の累積秒数ではない |
| `result_shown:{track}:{color}` | 完走リザルトの初表示のみ。失敗は自動リトライ/復活導線なのでこの分母には含まない |
| `retry_click/next_track:result:{stage}` | クリア結果の再挑戦/次へボタン。自動リトライを押下とは呼ばない |
| `revive_click:game:{stage}` | 復活ボタン操作。購入成功は従来Revive:Useで区別 |
| `tutorial_start:{onboarding/optional}:all` | 初回または任意の実操作練習開始 |
| `tutorial_step:{entry}:step_1/2/3` | 実際の操作成功。段階ごと1回 |
| `tutorial_complete/tutorial_exit:{entry}:step_N` | 全3段階を成功して終了、または未完了退出。終了ボタン押下だけを完了にしない |
| `intro_start/intro_complete/intro_skip:{onboarding/replay}:all` | オープニング開始・終端の「あそぶ」・明示スキップ |
| `entry_shown:home:{profile/sns/album}` | ホームが可視で、他のダイアログに覆われていないとき。可視状態を500ms間隔で確認。再描画では増えず、短い滞在は取りこぼす可能性あり |
| `profile_display/profile_locked:{home/album/profile}:{color}` | 紹介の表示／未解放条件の表示。profileはキャラタブ操作 |
| `interest:profile:{source}_{color}` | 「コスミー紹介」「この子たちを知る」またはキャラタブから、解放済みの実プロフィールに遷移。今回のUIは紹介入口から直接プロフィールを表示するため、その操作も対象。未解放条件は除外 |
| `social_open:home:all` | SNSパネルを開いた。主指標には含めない |
| `external_click:{social/profile}:{x/tiktok/instagram}` | 公式SNSのリンクを明示クリック |
| `interest:sns:{source}_{destination}` | 上記SNSクリックの主指標用分類。external_clickと合算しない |
| `character_select:{color}:unlocked` | キャラ装備操作。主指標には含めない |
| `character_unlock:{color}:{coins/stages}` | 購入または必要クリア数の初到達。購入済みを再度ステージ解放扱いにしない |
| `skill_experienced:{score/timing/coin/hold/shield}:{color}` | 実際に得点増・判定ランク改善・拡大範囲のコイン取得/追加得点・長押しの重力軽減・防御が起きた。1ランで効果ごと1回。単なるエフェクト表示で発火させない |
| `album_open:{locked/unlocked}:stage_N` | 思い出閲覧 |
| `story_unlock:album:stage_N` | 思い出初解放。移行や再表示は除外 |

LINEは準備中でリンクがないため送らない。他ゲームへのリンクは従来 `Promo:Click:*` に残し、キャラ関心率から除外。廃止中のFEVER/POWERの自然発動を架空のイベントとして追加しない。

## 分析するときの順序

1. 本番ビルドの `run_start` UUとD1/D7を確認し、母数と期間を記録。
2. 練習start → step_1 → step_2 → step_3 → complete、intro skipを見て導入での離脱を確認。
3. run_fail / run_exit / run_progressをステージ別に比較し、障害物追加後の難所を探す。曲の長さが違うので件数だけで難易度を断定しない。
4. entry_shown → profile/locked、SNSパネル → SNSクリックで導線を診断。主指標はinterestだけの重複除外UU。
5. キャラ効果体験・アルバム解放の有無による関心率を比較。プレイ量・解放状況も併記し、因果効果とは断定しない。

## 確認済み／未確認

- `node scripts/test-psf-analytics.js`：実音声開始、ポーズ復帰除外、練習除外、未解放紹介除外、SNS、重複終端防止、効果体験の重複防止、旧保存、再読み込み、外部Analytics通信ゼロを確認。
- `node scripts/test-live-tutorial.js`：操作成功で進む練習と記録非加算を確認。
- 配布Web/iOSへのコピーを実施。ストア公開は未実施。
- **管理画面ログイン・受信確認・ダッシュボード保存は行っていない。** 公開ビルドのDebug/Realtimeでrun_start、interest、buildを確認し、翌日以降に人数/Retentionへ反映されるか確認する必要がある。今回の自動テストを実ユーザーの改善成果とは扱わない。

API仕様：[GameAnalytics JavaScript Event Tracking](https://docs.gameanalytics.com/event-tracking-and-integrations/sdks-and-collection-api/open-source-sdks/javascript/event-tracking/)、[SDK Features](https://docs.gameanalytics.com/event-tracking-and-integrations/sdks-and-collection-api/open-source-sdks/javascript/sdk-features/)。Design Eventの5階層制約に合わせて分類。Design Eventでcustom dimensionsフィルターが使えるとは仮定していない。
