import {loadDataset} from '../src/lib/content/load';
import {validateDataset} from '../src/lib/content/validate';
const issues=validateDataset(await loadDataset('content'));
if(issues.length){console.error(JSON.stringify(issues,null,2));process.exitCode=1;}else console.log('Content validation passed');
