// useContext("select-container"), stuff, profit!

import { createContext } from "preact";
import { LinkTypes } from "../../Common/WindowEventTypes";

export const Links = createContext<LinkTypes>(LinkTypes.BRANCHES);
