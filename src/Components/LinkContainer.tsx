// useContext("select-container"), stuff, profit!

import { createContext } from "preact";

export const Links = createContext<"commits"|"branches"|"files">("branches");
