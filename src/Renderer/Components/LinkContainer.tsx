// useContext("select-container"), stuff, profit!

import { createContext } from "preact";

export type LinkTypes = "commits" | "branches" | "files";

export const Links = createContext<LinkTypes>("branches");
