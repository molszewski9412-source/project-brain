import { ProjectModule } from "../models/Module";
import { ProjectScanResult } from "../services/ProjectScanner";



export class PromptBuilder {





	static moduleAnalysis(

		module:ProjectModule

	):string {



		const lockRule =

		module.locked

		?

`THIS MODULE IS LOCKED.

You MUST NOT suggest:
- code changes
- refactoring
- architecture changes
- replacement

You may only:
- analyze
- document
- identify risks

`

		:

`THIS MODULE IS ACTIVE.

You may suggest improvements,
but never modify automatically.

`;







		return `


PROJECT BRAIN

AI ARCHITECT ASSISTANT


CORE RULES:


1. You are an architecture assistant, not a developer.

2. Never modify project files.

3. Never create final decisions.

4. Suggestions must be clearly marked as suggestions.

5. Missing information means UNKNOWN.

6. Never invent files, dependencies or features.



MODULE PERMISSION:


${lockRule}



MODULE DATA:


Name:

${module.name}



Status:

${module.status}



Progress:

${module.progress}%



Description:

${module.description}



Files:


${
module.files.length
?
module.files.join("\n")
:
"UNKNOWN"
}



Dependencies:


${
module.dependsOn.length
?
module.dependsOn.join("\n")
:
"UNKNOWN"
}



Created:

${module.createdAt}



Updated:

${module.updatedAt}



TASK:


Analyze this module.


FORMAT:


## FACTS

Only confirmed information.


## OBSERVATIONS

Architecture interpretation.


## RISKS

Potential problems.


## SUGGESTIONS

Optional improvements only.


## MODIFICATION AUTHORIZATION

State clearly:

ALLOWED

or

NOT ALLOWED



`;

	}









	static projectAnalysis(

		scan:ProjectScanResult

	):string {



		return `


PROJECT BRAIN

AI SOFTWARE ARCHITECT


You analyze an existing software project.

Your task is NOT to write code.

Your task is to discover the architecture,
identify modules and create a project map.



RULES:


1. Never invent files.

2. Use only provided scan data.

3. Unknown information must be marked UNKNOWN.

4. Think like a senior software architect.

5. Create logical modules based on folders,
technologies and file structure.



PROJECT LOCATION:


${scan.rootPath}



FILES:


${

scan.files.length

?

scan.files.join("\n")

:

"NO FILES"

}




FOLDERS:


${

scan.folders.length

?

scan.folders.join("\n")

:

"NO FOLDERS"

}




TECHNOLOGIES:


${

scan.technologies.length

?

scan.technologies.join("\n")

:

"UNKNOWN"

}




CONFIGURATION FILES:


${

scan.configFiles.length

?

scan.configFiles.join("\n")

:

"NONE"

}




RETURN ONLY VALID JSON.

NO MARKDOWN.

NO EXPLANATION.


FORMAT:


{

"modules":[

{

"name":"Module name",

"description":"What this module does",

"status":"PLANNED",

"files":[

"file1",

"file2"

]

}

],


"risks":[

"risk description"

],


"suggestions":[

"suggestion description"

]

}



`;

	}

}