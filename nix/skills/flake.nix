{
  inputs = {
    agent-skills = {
      url = "github:Kyure-A/agent-skills-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    anthropic-skills = {
      url = "github:anthropics/skills";
      flake = false;
    };
    functional-ts-principles = {
      url = "github:iwasa-kosui/functional-ts-principles";
      flake = false;
    };
    mizchi = {
      url = "github:mizchi/skills";
      flake = false;
    };
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    react-doctor = {
      url = "github:millionco/react-doctor";
      flake = false;
    };
    vercel-skills = {
      url = "github:vercel-labs/agent-skills";
      flake = false;
    };
  };

  outputs =
    {
      agent-skills,
      anthropic-skills,
      functional-ts-principles,
      mizchi,
      nixpkgs,
      react-doctor,
      vercel-skills,
      ...
    }:
    let
      inherit (nixpkgs) lib;
      forEachSystem = lib.genAttrs [
        "aarch64-darwin"
        "aarch64-linux"
        "x86_64-darwin"
        "x86_64-linux"
      ];
    in
    {
      devShells = forEachSystem (
        system:
        let
          pkgs = import nixpkgs { inherit system; };

          agentLib = agent-skills.lib.agent-skills;
          sources = {
            _project = {
              path = ../../skills;
            };
            anthropic = {
              path = anthropic-skills;
              subdir = "skills";
            };
            functional-ts-principles = {
              path = functional-ts-principles;
              subdir = "skills";
            };
            mizchi = {
              path = mizchi;
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
              "byethrow"
              "composition-patterns"
              "frontend-design"
              "functional-ts"
              "functional-ts-review"
              "next-bundle-analyzer"
              "playwright-cli"
              "playwright-test"
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
        {
          default = pkgs.mkShell {
            shellHook = agentLib.mkShellHook {
              inherit pkgs bundle;
              targets = localTargets;
            };
          };
        }
      );
    };
}
