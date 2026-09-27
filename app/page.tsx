import Workbench from './workbench';
import { LocaleProvider } from './locale';
export default function Home() { return <LocaleProvider><Workbench /></LocaleProvider>; }
