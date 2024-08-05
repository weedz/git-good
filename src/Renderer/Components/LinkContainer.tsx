// useContext("select-container"), stuff, profit!

import { createContext } from "preact";
import { LinkTypes } from "../../Common/WindowEventTypes.js";

export const Links = createContext<LinkTypes>(LinkTypes.BRANCHES);
