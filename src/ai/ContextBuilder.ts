import { KnowledgeService } from "../knowledge/KnowledgeService";
import { RoadmapService } from "../knowledge/RoadmapService";
import { RulesService } from "../knowledge/RulesService";

import { ProjectStore } from "../storage/projectStore";

import { ProjectModule } from "../models/Module";




export class ContextBuilder {



	static buildModuleContext(

		module:ProjectModule

	):string {



		const knowledge =

		new KnowledgeService()

		.load();





		const roadmap =

		new RoadmapService()

		.load();





		const rules =

		new RulesService()

		.load();





		const store =

		new ProjectStore();





		const history =

		store.loadHistory()

		.filter(

			h => h.target === module.id

		);





		const decisions =

		store.loadDecisions()

		.filter(

			d => d.moduleId === module.id

		);








		return `


================================================

PROJECT BRAIN CONTEXT

================================================



PROJECT VISION:

${knowledge.vision}





PROJECT PRINCIPLES:

${

knowledge.principles.join("\n")

}






PROJECT RULES:







MODULE STATUS DEFINITIONS:

${

Object.entries(

rules.moduleStatuses

)

.map(

([status,rule])=>`

${status}

Meaning:

${rule.meaning}



Allowed:

${

rule.allowedActions?.join(", ")

??

"NONE"

}



Forbidden:

${

rule.forbiddenActions?.join(", ")

??

"NONE"

}

`

)

.join("\n")

}







ROADMAP:

${

roadmap.map(

item =>

`${item.id}

${item.name}

Status:

${item.status}`

)

.join("\n\n")

}







CURRENT MODULE:





Name:

${module.name}



Status:

${module.status}



Progress:

${module.progress}%



Locked:

${module.locked}





Description:

${module.description}






FILES:

${

module.files.length

?

module.files.join("\n")

:

"NONE"

}






DEPENDENCIES:

${

module.dependsOn.length

?

module.dependsOn.join("\n")

:

"NONE"

}






MODULE HISTORY:

${

history.length

?

history.map(

h =>

`${h.action}: ${h.description}`

)

.join("\n")

:

"NONE"

}






DECISIONS:

${

decisions.length

?

JSON.stringify(

decisions,

null,

2

)

:

"NONE"

}






================================================

END PROJECT BRAIN CONTEXT

================================================



`;



	}



}