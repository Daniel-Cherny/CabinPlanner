import {
  users,
  projects,
  templates,
  materials,
  materialCategories,
  projectMaterials,
  constructionPhases,
  type User,
  type UpsertUser,
  type Project,
  type InsertProject,
  type Template,
  type InsertTemplate,
  type Material,
  type MaterialCategory,
  type ProjectMaterial,
  type InsertProjectMaterial,
  type ConstructionPhase,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Project operations
  getProjectsByUser(userId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  
  // Template operations
  getTemplates(): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  
  // Material operations
  getMaterialCategories(): Promise<MaterialCategory[]>;
  getMaterialsByCategory(categoryId: string): Promise<Material[]>;
  getMaterials(): Promise<Material[]>;
  getMaterial(id: string): Promise<Material | undefined>;
  
  // Project material operations
  getProjectMaterials(projectId: string): Promise<(ProjectMaterial & { material: Material })[]>;
  addProjectMaterial(projectMaterial: InsertProjectMaterial): Promise<ProjectMaterial>;
  updateProjectMaterial(id: string, projectMaterial: Partial<InsertProjectMaterial>): Promise<ProjectMaterial>;
  removeProjectMaterial(id: string): Promise<void>;
  
  // Construction phase operations
  getConstructionPhases(): Promise<ConstructionPhase[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Project operations
  async getProjectsByUser(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Template operations
  async getTemplates(): Promise<Template[]> {
    return await db
      .select()
      .from(templates)
      .where(eq(templates.isPublic, true))
      .orderBy(templates.name);
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template;
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const [newTemplate] = await db.insert(templates).values(template).returning();
    return newTemplate;
  }

  // Material operations
  async getMaterialCategories(): Promise<MaterialCategory[]> {
    return await db
      .select()
      .from(materialCategories)
      .orderBy(materialCategories.displayOrder, materialCategories.name);
  }

  async getMaterialsByCategory(categoryId: string): Promise<Material[]> {
    return await db
      .select()
      .from(materials)
      .where(and(eq(materials.categoryId, categoryId), eq(materials.isActive, true)))
      .orderBy(materials.name);
  }

  async getMaterials(): Promise<Material[]> {
    return await db
      .select()
      .from(materials)
      .where(eq(materials.isActive, true))
      .orderBy(materials.name);
  }

  async getMaterial(id: string): Promise<Material | undefined> {
    const [material] = await db.select().from(materials).where(eq(materials.id, id));
    return material;
  }

  // Project material operations
  async getProjectMaterials(projectId: string): Promise<(ProjectMaterial & { material: Material })[]> {
    return await db
      .select({
        id: projectMaterials.id,
        projectId: projectMaterials.projectId,
        materialId: projectMaterials.materialId,
        quantity: projectMaterials.quantity,
        totalCost: projectMaterials.totalCost,
        addedAt: projectMaterials.addedAt,
        material: materials,
      })
      .from(projectMaterials)
      .innerJoin(materials, eq(projectMaterials.materialId, materials.id))
      .where(eq(projectMaterials.projectId, projectId));
  }

  async addProjectMaterial(projectMaterial: InsertProjectMaterial): Promise<ProjectMaterial> {
    const [newProjectMaterial] = await db
      .insert(projectMaterials)
      .values(projectMaterial)
      .returning();
    return newProjectMaterial;
  }

  async updateProjectMaterial(id: string, projectMaterial: Partial<InsertProjectMaterial>): Promise<ProjectMaterial> {
    const [updatedProjectMaterial] = await db
      .update(projectMaterials)
      .set(projectMaterial)
      .where(eq(projectMaterials.id, id))
      .returning();
    return updatedProjectMaterial;
  }

  async removeProjectMaterial(id: string): Promise<void> {
    await db.delete(projectMaterials).where(eq(projectMaterials.id, id));
  }

  // Construction phase operations
  async getConstructionPhases(): Promise<ConstructionPhase[]> {
    return await db
      .select()
      .from(constructionPhases)
      .orderBy(constructionPhases.displayOrder);
  }
}

export const storage = new DatabaseStorage();
