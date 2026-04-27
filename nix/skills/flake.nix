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
