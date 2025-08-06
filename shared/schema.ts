import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project templates
export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull(), // 'a-frame', 'tiny-house', 'log-cabin', 'modern'
  imageUrl: varchar("image_url"),
  defaultWidth: decimal("default_width", { precision: 8, scale: 2 }),
  defaultLength: decimal("default_length", { precision: 8, scale: 2 }),
  defaultHeight: decimal("default_height", { precision: 8, scale: 2 }),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }),
  designData: jsonb("design_data"), // Canvas elements, materials, etc.
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User projects
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  templateId: uuid("template_id").references(() => templates.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  width: decimal("width", { precision: 8, scale: 2 }),
  length: decimal("length", { precision: 8, scale: 2 }),
  height: decimal("height", { precision: 8, scale: 2 }),
  area: decimal("area", { precision: 10, scale: 2 }),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  designData: jsonb("design_data"), // Canvas state, elements, etc.
  buildProgress: jsonb("build_progress"), // Construction phase progress
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Material categories
export const materialCategories = pgTable("material_categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  displayOrder: integer("display_order").default(0),
});

// Materials library
export const materials = pgTable("materials", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: uuid("category_id").notNull().references(() => materialCategories.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  unit: varchar("unit", { length: 20 }).notNull(), // 'board', 'sq ft', 'bag', 'sheet', etc.
  pricePerUnit: decimal("price_per_unit", { precision: 8, scale: 2 }),
  imageUrl: varchar("image_url"),
  specifications: jsonb("specifications"), // Technical details
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project materials (what materials are used in each project)
export const projectMaterials = pgTable("project_materials", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  materialId: uuid("material_id").notNull().references(() => materials.id),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  addedAt: timestamp("added_at").defaultNow(),
});

// Construction phases
export const constructionPhases = pgTable("construction_phases", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  estimatedDays: integer("estimated_days"),
  skillLevel: varchar("skill_level", { length: 20 }), // 'beginner', 'intermediate', 'expert', 'professional'
  displayOrder: integer("display_order").default(0),
  instructions: jsonb("instructions"), // Step-by-step instructions
  safetyNotes: text("safety_notes"),
  toolsRequired: jsonb("tools_required"),
  materialsRequired: jsonb("materials_required"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const templatesRelations = relations(templates, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  template: one(templates, {
    fields: [projects.templateId],
    references: [templates.id],
  }),
  projectMaterials: many(projectMaterials),
}));

export const materialCategoriesRelations = relations(materialCategories, ({ many }) => ({
  materials: many(materials),
}));

export const materialsRelations = relations(materials, ({ one, many }) => ({
  category: one(materialCategories, {
    fields: [materials.categoryId],
    references: [materialCategories.id],
  }),
  projectMaterials: many(projectMaterials),
}));

export const projectMaterialsRelations = relations(projectMaterials, ({ one }) => ({
  project: one(projects, {
    fields: [projectMaterials.projectId],
    references: [projects.id],
  }),
  material: one(materials, {
    fields: [projectMaterials.materialId],
    references: [materials.id],
  }),
}));

// Insert schemas
export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMaterialSchema = createInsertSchema(materials).omit({
  id: true,
  createdAt: true,
});

export const insertProjectMaterialSchema = createInsertSchema(projectMaterials).omit({
  id: true,
  addedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type MaterialCategory = typeof materialCategories.$inferSelect;
export type ProjectMaterial = typeof projectMaterials.$inferSelect;
export type InsertProjectMaterial = z.infer<typeof insertProjectMaterialSchema>;
export type ConstructionPhase = typeof constructionPhases.$inferSelect;
