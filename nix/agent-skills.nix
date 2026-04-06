{
  pkgs,
  agent-skills,
  anthropic-skills,
  react-doctor,
  vercel-skills,
  ...
}:
let
  agentLib = agent-skills.lib.agent-skills;

  sources = {
    anthropic = {
      path = anthropic-skills;
      subdir = "skills";
    };
    react-doctor = {
      path = react-doctor;
      subdir = "skills";
    };
    vercel = {
      path = vercel-skills;
      subdir = "skills";
    };
  };

  catalog = agentLib.discoverCatalog sources;
  allowlist = agentLib.allowlistFor {
    inherit catalog sources;
    enable = [
      "composition-patterns"
      "frontend-design"
      "react-best-practices"
      "react-doctor"
      "react-view-transitions"
      "web-design-guidelines"
    ];
  };
  selection = agentLib.selectSkills {
    inherit catalog allowlist sources;
    skills = { };
  };
  bundle = agentLib.mkBundle { inherit pkgs selection; };
  localTargets = {
    claude = agentLib.defaultLocalTargets.claude // {
      enable = true;
    };
  };
in
agentLib.mkShellHook {
  inherit pkgs bundle;
  targets = localTargets;
}
