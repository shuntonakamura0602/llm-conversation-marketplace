import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("schema enforces ownership, private access, telemetry deduplication and report privacy", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth,public to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`,
    );
    await db.exec(
      await readFile(
        new URL("../supabase/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    const a = "11111111-1111-4111-8111-111111111111",
      b = "22222222-2222-4222-8222-222222222222";
    await db.exec(
      `insert into auth.users values ('${a}'),('${b}');set role authenticated;set request.jwt.claim.sub='${a}';`,
    );
    const insert = await db.query<{ id: string }>(
      `insert into public.conversations(user_id,title,description,llm,messages,estimated_reading_minutes,published) values ($1,'タイトル','説明','ChatGPT','[{"role":"user","content":"問い"},{"role":"assistant","content":"回答"}]',1,false) returning id`,
      [a],
    );
    const id = insert.rows[0].id;
    assert.equal(
      (await db.query("select * from public.conversations")).rows.length,
      1,
    );
    await db.exec(`set request.jwt.claim.sub='${b}'`);
    assert.equal(
      (await db.query("select * from public.conversations")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "update public.conversations set published=true returning id",
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        `insert into public.conversations(user_id,title,description,llm,messages,estimated_reading_minutes) values ($1,'x','y','ChatGPT','[{"role":"user","content":"x"},{"role":"assistant","content":"y"}]',1)`,
        [a],
      ),
    );
    await db.exec(
      `set request.jwt.claim.sub='${a}';update public.conversations set published=true;`,
    );
    await assert.rejects(
      db.query(`update public.conversations set view_count=100`),
    );
    await assert.rejects(
      db.query(
        `update public.conversations set messages='[{"role":"user","content":{}},{"role":"assistant","content":"y"}]'`,
      ),
    );
    await db.exec(`reset role;set role anon;set request.jwt.claim.sub='';`);
    assert.equal(
      (await db.query("select * from public.conversations")).rows.length,
      1,
    );
    for (let i = 0; i < 2; i++)
      await db.query(
        `select public.record_event($1,$2,$3,'conversation_view','{}')`,
        [a, b, id],
      );
    assert.equal(
      (
        await db.query<{ view_count: number }>(
          "select view_count from public.conversations",
        )
      ).rows[0].view_count,
      1,
    );
    await assert.rejects(db.query("select * from public.events"));
    await assert.rejects(
      db.query(`select public.record_event($1,$2,$3,'invalid','{}')`, [
        a,
        b,
        id,
      ]),
    );
    await db.query(
      `select public.report_conversation($1,'個人情報','試験用の報告')`,
      [id],
    );
    await assert.rejects(db.query("select * from public.reports"));
    await db.exec("reset role");
    assert.equal(
      (await db.query("select * from public.events")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from public.reports")).rows.length,
      1,
    );
    await db.exec(
      await readFile(
        new URL("../supabase/analytics.sql", import.meta.url),
        "utf8",
      ),
    );
  } finally {
    await db.close();
  }
});
