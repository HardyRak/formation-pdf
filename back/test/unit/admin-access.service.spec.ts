import { AdminAccessService } from "../../src/admin/admin-access.service";
import { AccessService } from "../../src/access/access.service";

type Row = Record<string, unknown> & { _id: string };

/** Modèle minimal pour User / Formation / Document (findById / find). */
function model(rows: Row[]) {
  return {
    findById: (id: string) => ({
      lean: () => Promise.resolve(rows.find((r) => r._id === id) ?? null),
    }),
    find: (filter: { _id?: { $in?: string[] } }) => ({
      lean: () =>
        Promise.resolve(
          rows.filter(
            (r) => !filter?._id?.$in || filter._id.$in.includes(r._id),
          ),
        ),
    }),
  };
}

/** Faux AccessService : getGrant + upsertGrant en mémoire. */
class FakeAccessService {
  private grants = new Map<
    string,
    {
      userId: string;
      formationId: string;
      levelIds: string[];
      documentIds: string[];
    }
  >();

  seed(
    rows: Array<{
      userId: string;
      formationId: string;
      levelIds: string[];
      documentIds: string[];
    }>,
  ) {
    for (const row of rows) {
      this.grants.set(`${row.userId}:${row.formationId}`, { ...row });
    }
  }

  async getGrant(userId: string, formationId: string) {
    return this.grants.get(`${userId}:${formationId}`) ?? null;
  }

  async upsertGrant(
    userId: string,
    formationId: string,
    levelIds: string[],
    documentIds: string[],
  ) {
    const grant = {
      _id: `${userId}:${formationId}`,
      userId,
      formationId,
      levelIds,
      documentIds,
    };
    this.grants.set(grant._id, grant);
    return grant;
  }

  async listGrants(userId?: string) {
    return Array.from(this.grants.values()).filter(
      (g) => !userId || g.userId === userId,
    );
  }
}

const user = {
  _id: "usr-1",
  email: "s@x.io",
  firstName: "Sophie",
  lastName: "Martin",
};
const formation = { _id: "f-hse", name: "HSE" };
const doc = { _id: "doc-hse-101", formationId: "f-hse", levelId: "l-hse-1" };

function build(
  initialAccess: Array<{
    userId: string;
    formationId: string;
    levelIds: string[];
    documentIds: string[];
  }> = [],
) {
  const access = new FakeAccessService();
  access.seed(initialAccess);
  return new AdminAccessService(
    model([user]) as never,
    model([formation]) as never,
    model([doc]) as never,
    access as unknown as AccessService,
  );
}

describe("AdminAccessService.grantDocument", () => {
  it("refuse un accès déjà entièrement couvert (tous niveaux + tous documents)", async () => {
    const service = build([
      { userId: "usr-1", formationId: "f-hse", levelIds: [], documentIds: [] },
    ]);

    await expect(
      service.grantDocument("usr-1", "f-hse", [], []),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({ code: "CONFLICT", status: 409 }),
    });
  });

  it("refuse le même document déjà octroyé", async () => {
    const service = build([
      {
        userId: "usr-1",
        formationId: "f-hse",
        levelIds: ["l-hse-1"],
        documentIds: ["doc-hse-101"],
      },
    ]);

    await expect(
      service.grantDocument("usr-1", "f-hse", ["l-hse-1"], ["doc-hse-101"]),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({ code: "CONFLICT", status: 409 }),
    });
  });

  it("accepte un accès partiel non couvert (fusion union)", async () => {
    const access = new FakeAccessService();
    access.seed([
      {
        userId: "usr-1",
        formationId: "f-hse",
        levelIds: ["l-hse-1"],
        documentIds: ["doc-hse-101"],
      },
    ]);
    const service = new AdminAccessService(
      model([user]) as never,
      model([formation]) as never,
      model([doc]) as never,
      access as unknown as AccessService,
    );

    const saved = await service.grantDocument(
      "usr-1",
      "f-hse",
      ["l-hse-2"],
      [],
    );

    expect(saved.levelIds).toEqual(["l-hse-2"]);
  });
});
