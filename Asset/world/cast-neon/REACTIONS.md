# プレイ中のリアクション

内蔵 image_gen で生成した透過シート reactions.png。左から赤・水色・ピンク・緑・紫。実行時に各領域を読み込み、既存の透過トリミング処理でサイズを揃える。読み込み失敗時は通常画像を使う。

ジャンプ軌道・当たり判定・能力値は変更せず、踏み切りの伸縮・着地の弾み・小さな傾きとポーズ切替を追加。通常の空中回転は廃止。重力反転時は足を天井に向ける。
赤はPERFECT、水色はPERFECT/GREAT、ピンクはコイン取得、緑は長押し上昇、紫は既存のシールド発動に反応する。

## 生成プロンプト

Create a game sprite sheet with exactly FIVE equal-width cells in ONE HORIZONTAL ROW, transparent background, wide 5:1 aspect ratio. Each cell has exactly one full-body character centered at same scale with ample clear margin, no overlaps. Left to right RED, BLUE, PINK, GREEN, PURPLE from five reference images in same order. Preserve their exact anatomy, accessories, colors, thick plum outline and glossy neon cyan/magenta lighting. These are successful-jump / special-ability reaction poses, front-facing faces always visible. RED: both tiny arms raised cheerfully, delighted smile, original round star earmuffs. BLUE: graceful tiny arms out, slight jaunty pose, preserve sleepy lavender eyelids AND lavender sclera, exactly one eyelash per eye, two pink bows and FOUR stars (two each side), tiny cute smile. PINK: catlike paws reaching forward excitedly, big glossy eyes, heart tipped cat ears. GREEN: relaxed floating arms out, eyes remain two straight closed lines, tiny content smile, sprout and single star. PURPLE: playful sideways raised hand, mischievous half-lidded eyes, tiny fang, two horns, NO wings. Small mitten hands, original squat head/body proportions, no elongated limbs. Keep feet approximately aligned same baseline in all five cells. Absolutely NO text, labels, frames, ground, scenery, shadows or floating extra decorations. Exactly five characters and transparent spacing between cells. This is production art matching all five refs, not a concept poster.
