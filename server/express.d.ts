import type { User as SchemaUser } from "@shared/schema";

declare global {
    namespace Express {
        // Augment the Express User interface to match our schema's User type
        interface User extends SchemaUser { }
    }
}

// This file needs to be a module for the augmentation to work
export { };
