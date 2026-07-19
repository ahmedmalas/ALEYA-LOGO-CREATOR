import { composeRefinedConcept, composeSvgConcepts } from "@/lib/logo/svg-composer";
import type { ImageProvider, GenerateRequest, RefineRequest } from "./types";

export class SvgCompositionProvider implements ImageProvider {
  readonly name = "svg";

  async generateConcepts(request: GenerateRequest) {
    const count = Math.min(Math.max(request.count, 1), 8);
    return composeSvgConcepts(request.brief, count, request.seed ?? crypto.randomUUID());
  }

  async refineConcept(request: RefineRequest) {
    return await composeRefinedConcept(request.brief, request.concept, request.instruction);
  }
}
