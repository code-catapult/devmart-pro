-- CreateIndex
CREATE INDEX "ActivityLog_action_createdAt_idx" ON "ActivityLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_ipAddress_createdAt_idx" ON "ActivityLog"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_action_idx" ON "ActivityLog"("userId", "action");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportNote_adminId_idx" ON "SupportNote"("adminId");

-- CreateIndex
CREATE INDEX "SupportNote_userId_category_createdAt_idx" ON "SupportNote"("userId", "category", "createdAt");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_role_suspended_idx" ON "users"("role", "suspended");
