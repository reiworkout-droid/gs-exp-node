// まずはexpressを使えるようにする
const express = require('express');

const cors = require("cors");
// → CORS: 異なるドメイン間の通信を許可
//   Next.js（localhost:3000）からAPI（localhost:5000）にアクセスできるようにする

const { PrismaClient } = require("./generated/prisma");
// → Prisma Client: データベースを操作するためのクラス
//   prisma.post.findMany() などでCRUD操作ができる

// ここで実行してapp()のはこの中にexpressの機能を使えるようにする
const app = express();
const PORT = 8888;

const prisma = new PrismaClient();
// → Prisma Client のインスタンスを作成
//   この prisma を使ってDBを操作する

// ========================================
// ミドルウェアの設定
// ========================================
// ミドルウェア = リクエストを処理する前に実行される関数
// 全てのリクエストに対して共通の処理を行う

app.use(cors());
// → CORS を許可
//   これがないと Next.js から API にアクセスできない

app.use(express.json());
// → JSON リクエストを解析
//   req.body でJSONデータを受け取れるようにする

//1. ここから簡単なAPIを作る
app.get("/", (req, res) => {
    //resはresponse返答しますの意味
    res.send("<h1>おおほりは長野で研究しています</h1>");
});

// ========================================
// 投稿一覧取得 API
// ========================================
// GET /api/posts にアクセスしたときの処理

app.get("/api/posts", async (req, res) => {
  // async = この関数の中で await を使えるようにする
  try {
    // try-catch = エラーが起きても安全に処理する

    const posts = await prisma.post.findMany({
      // prisma.post = Post テーブルを操作
      // findMany() = 複数のデータを取得
      orderBy: { createdAt: "desc" },
      // orderBy = 並び順を指定
      // createdAt: "desc" = 作成日時の降順（新しい順）
    });

    res.json(posts);
    // → 取得したデータをJSON形式で返す

  } catch (error) {
    // エラーが発生した場合

    console.error("Error fetching posts:", error);
    // → エラーログを出力（デバッグ用）

    res.status(500).json({ error: "投稿の取得に失敗しました" });
    // → 500 = サーバーエラー
    // → エラーメッセージを返す
  }
});

// ここからAPIを開発する流れをイメージする(ルート（URL）に対するGETリクエストの処理)
app.post("/api/posts", async (req, res) => {
    try {
        //ここから送られたデータを受け取る
        const { content, imageUrl, userId } = req.body;
        //req.body = データの塊でAPIでデータが送られる場所になっている.そこから分割代入というjsのテクニックを使って抜き出す

        //バリデーションのチェックをする.

        if (!content || content.trim() === ""){
            //エラーを通知.結果をresponseとして通知
            return res.status(400).json({
                error: "投稿の中身が空なので入力してください"
            })
        }

        //登録の処理. prismaを使ってデータを実際に登録するフェーズ
        const post = await prisma.post.create({
            // prismaの公式のお作法
            data: {
                content: content.trim(),
                imageUrl: imageUrl || null,
                userId: userId || null,
            },
        }); 
    // この形式をDBに登録した後に成功したという結果をstatusでお知らせとデータを戻してくれる🤗
        res.status(201).json(post);
    } catch (error) {
        // エラーの書き方は変わりませんのでテンプレと思ってください🤗
        console.error("Error creating post:", error);
        res.status(500).json({ error: "投稿の作成に失敗しました" });
    }
});

// ========================================
// 投稿削除 API
// ========================================
// DELETE /api/posts/:id にアクセスしたときの処理
// :id = パスパラメータ（URL の一部として ID を受け取る）

app.delete("/api/posts/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // req.params = URL のパスパラメータ
    // req.params.id = :id の部分の値
    // parseInt() = 文字列を整数に変換（"1" → 1）

    if (isNaN(id)) {
      // isNaN() = 数字でないかチェック
      return res.status(400).json({ error: "無効なIDです" });
    }

    await prisma.post.delete({
      // prisma.post.delete() = データを削除
      where: { id },
      // where = 条件を指定
      // { id } = { id: id } の省略形（ES6）
    });

    res.json({ message: "投稿を削除しました" });

  } catch (error) {
    console.error("Error deleting post:", error);

    if (error.code === "P2025") {
      // P2025 = Prisma のエラーコード（レコードが見つからない）
      return res.status(404).json({ error: "投稿が見つかりません" });
      // → 404 = Not Found
    }

    res.status(500).json({ error: "投稿の削除に失敗しました" });
  }
});

// 最後にここでサーバを起動させる. listenがないと動かない.
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
});