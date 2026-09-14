import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("paywall is atomic, owner-only and reversible without losing content", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth,public to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`,
    );
    for (const file of ["schema.sql", "migrations/20260913_paywall.sql"])
      await db.exec(
        await readFile(new URL(`../supabase/${file}`, import.meta.url), "utf8"),
      );
    const a = "11111111-1111-4111-8111-111111111111",
      b = "22222222-2222-4222-8222-222222222222";
    await db.exec(
      `insert into auth.users values('${a}'),('${b}');set role authenticated;set request.jwt.claim.sub='${a}';`,
    );
    const messages = [
      { role: "user", content: "free question" },
      { role: "assistant", content: "free answer" },
      { role: "user", content: "secret question" },
      { role: "assistant", content: "secret answer" },
    ];
    const content = {
      title: "title",
      description: "description",
      llm: "ChatGPT",
      messages,
      tags: [],
      summary: [],
      published: true,
      estimated_reading_minutes: 1,
    };
    const { rows } = await db.query<{ id: string }>(
      "select public.create_paid_conversation($1,2) id",
      [JSON.stringify(content)],
    );
    const id = rows[0].id;
    assert.equal(
      (
        await db.query<{ messages: unknown[] }>(
          "select messages from public.conversations",
        )
      ).rows[0].messages.length,
      2,
    );
    assert.deepEqual(
      (
        await db.query<{ messages: unknown[] }>(
          "select messages from public.conversation_paid_content",
        )
      ).rows[0].messages,
      messages,
    );
    await assert.rejects(
      db.query("update public.conversations set messages=$1", [
        JSON.stringify(messages),
      ]),
    );
    await db.exec(`set request.jwt.claim.sub='${b}'`);
    assert.equal(
      (await db.query("select * from public.conversation_paid_content")).rows
        .length,
      0,
    );
    await assert.rejects(
      db.query("select public.set_conversation_paywall($1,null)", [id]),
    );
    await db.exec(`reset role;set role anon;set request.jwt.claim.sub='';`);
    assert.equal(
      JSON.stringify(
        (await db.query("select * from public.conversations")).rows,
      ).includes("secret"),
      false,
    );
    await assert.rejects(
      db.query("select * from public.conversation_paid_content"),
    );
    await assert.rejects(
      db.query("select public.set_conversation_paywall($1,null)", [id]),
    );
    await db.exec(
      `reset role;set role authenticated;set request.jwt.claim.sub='${a}';`,
    );
    await db.query("select public.set_conversation_paywall($1,3)", [id]);
    assert.equal(
      (
        await db.query<{ messages: unknown[] }>(
          "select messages from public.conversations",
        )
      ).rows[0].messages.length,
      3,
    );
    await db.query("select public.set_conversation_paywall($1,null)", [id]);
    assert.deepEqual(
      (
        await db.query<{ messages: unknown[] }>(
          "select messages from public.conversations",
        )
      ).rows[0].messages,
      messages,
    );
    assert.equal(
      (await db.query("select * from public.conversation_paid_content")).rows
        .length,
      0,
    );
    await assert.rejects(
      db.query("select public.create_paid_conversation($1,99)", [
        JSON.stringify(content),
      ]),
    );
    assert.equal(
      (await db.query("select * from public.conversations")).rows.length,
      1,
    );
    await db.query("select public.set_conversation_paywall($1,2)", [id]);
    await db.exec(`set request.jwt.claim.sub='${b}'`);
    assert.equal(
      (
        await db.query(
          "delete from public.conversations where id=$1 returning id",
          [id],
        )
      ).rows.length,
      0,
    );
    await db.exec(`reset role;set role anon;set request.jwt.claim.sub='';`);
    await assert.rejects(
      db.query("delete from public.conversations where id=$1", [id]),
    );
    await db.exec(
      `reset role;set role authenticated;set request.jwt.claim.sub='${a}';`,
    );
    assert.equal(
      (
        await db.query(
          "delete from public.conversations where id=$1 returning id",
          [id],
        )
      ).rows.length,
      1,
    );
    await db.exec("reset role");
    assert.equal(
      (await db.query("select * from public.conversation_paid_content")).rows
        .length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.conversations")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
