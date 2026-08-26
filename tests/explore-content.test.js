import test from "node:test";
import assert from "node:assert/strict";
import {
  EXPLORE_WORLDS,
  allExploreLessons,
  allExploreTerritories,
} from "../explore-catalog.js";

test("Explore ships a complete five-article curriculum for all 60 territories", () => {
  const territories = allExploreTerritories();
  const lessons = allExploreLessons();

  assert.equal(EXPLORE_WORLDS.length, 12);
  assert.equal(territories.length, 60);
  assert.equal(lessons.length, 300);
  territories.forEach((territory) => {
    assert.equal(lessons.filter((lesson) => lesson.territoryId === territory.id).length, 5);
  });
});

test("every Explore day contains substantial preloaded article material", () => {
  allExploreLessons().forEach((lesson) => {
    const { article } = lesson;
    assert.ok(article, `${lesson.title} has no article`);
    assert.ok(article.wordCount >= 500, `${lesson.title} is only ${article.wordCount} words`);
    assert.ok(article.sections.length >= 4, `${lesson.title} needs more explanatory sections`);
    assert.ok(article.sections.every((section) => section.heading && section.paragraphs.length >= 2));
    assert.ok(article.analogy);
    assert.ok(article.essentialFacts.length >= 4);
    assert.ok(article.misconception);
    assert.ok(article.activity.prompt);
    assert.ok(article.activity.answer);
    assert.ok(article.reflectionQuestion);
    assert.ok(article.sources.length >= 2);
  });
});

test("Explore articles do not fall back to the removed research-prompt format", () => {
  const removedCopy = /today[’']s action|pause\s*&?\s*reflect|why it matters|do (?:some )?research/i;
  allExploreLessons().forEach((lesson) => {
    const articleText = JSON.stringify(lesson.article);
    assert.equal(removedCopy.test(articleText), false, `${lesson.title} contains removed placeholder copy`);
    assert.equal("whyItMatters" in lesson, false);
    assert.equal("action" in lesson, false);
  });
});

