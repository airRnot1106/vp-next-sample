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
    nix-vite-plus = {
      url = "github:ryoppippi/nix-vite-plus";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    react-doctor = {
      url = "github:millionco/react-doctor";
      flake = false;
    };
    systems.url = "github:nix-systems/default";
    treefmt-nix = {
      url = "github:numtide/treefmt-nix";
      inputs.nixpkgs.follows = "nixpkgs";
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
      nix-vite-plus,
      nixpkgs,
      react-doctor,
      systems,
      treefmt-nix,
      vercel-skills,
      ...
    }:
    let
      eachSystem =
        f:
        nixpkgs.lib.genAttrs (import systems) (
          system:
          f {
            inherit system;
            pkgs = nixpkgs.legacyPackages.${system};
          }
        );
    in
    {
      devShells = eachSystem (
        { pkgs, system }:
        let
          agentShell = import ./nix/agent-skills.nix {
            inherit
              pkgs
              agent-skills
              anthropic-skills
              react-doctor
              vercel-skills
              ;
          };
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              actionlint
              ghalint
              gitleaks
              nix-vite-plus.packages.${system}.vp
              pinact
            ];
            shellHook = agentShell;
          };
        }
      );
      formatter = eachSystem (
        { pkgs, ... }:
        treefmt-nix.lib.mkWrapper pkgs {
          projectRootFile = "flake.nix";
          programs = {
            nixfmt.enable = true;
          };
        }
      );
    };
}
