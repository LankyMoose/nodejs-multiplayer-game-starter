import "./global.css"
import { mount } from "kiru"
import App from "./app"

mount(<App />, document.getElementById("app")!, { name: "client" })
