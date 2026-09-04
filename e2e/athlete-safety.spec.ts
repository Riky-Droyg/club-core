import { expect, test } from "@playwright/test";

test("athlete is deactivated through a custom confirmation and hard delete stays in profile", async ({
  page,
}) => {
  await page.goto("/login?next=/athletes");
  await page.getByLabel("Email").fill("coach@clubcore.local");
  await page.getByLabel("Пароль").fill("ClubCoreDemo123!");
  await page.getByRole("button", { name: "Увійти" }).click();
  await expect(page).toHaveURL(/\/athletes/);

  const unique = Date.now().toString();
  await page.getByRole("button", { name: /Новий спортсмен/ }).click();
  const createDialog = page.getByRole("dialog", { name: "Новий спортсмен" });
  await createDialog.getByLabel("Ім’я *").fill("Е2Е");
  await createDialog.getByLabel("Прізвище *").fill(`Тест${unique}`);
  await createDialog.getByLabel("Телефон *").fill("+380671234567");
  await createDialog.getByLabel("Група").selectOption({ index: 1 });
  await createDialog.getByRole("button", { name: "Створити" }).click();

  const row = page.getByRole("article").filter({ hasText: `Тест${unique}` });
  await expect(row).toContainText("Активний");
  await expect(row.getByRole("button", { name: /Видалити/ })).toHaveCount(0);

  await row.getByRole("button", { name: "Деактивувати" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("усіх активних груп");
  await dialog.getByRole("button", { name: "Скасувати" }).click();
  await expect(row).toContainText("Активний");

  await row.getByRole("button", { name: "Деактивувати" }).click();
  await dialog.getByRole("button", { name: "Деактивувати" }).click();
  await expect(page.getByRole("status")).toContainText("Спортсмена деактивовано");
  await expect(row).toContainText("Неактивний");

  await row.getByRole("link", { name: "Огляд" }).click();
  await page.getByRole("button", { name: "Видалити спортсмена" }).click();
  const deleteDialog = page.getByRole("alertdialog");
  await deleteDialog.getByLabel("Для підтвердження введіть ВИДАЛИТИ").fill("ВИДАЛИТИ");
  await deleteDialog.getByRole("button", { name: "Видалити назавжди" }).click();
  await expect(page).toHaveURL(/\/athletes/);
});
