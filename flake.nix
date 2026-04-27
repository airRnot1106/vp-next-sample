{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    skills = {
      url = "path:./nix/skills";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    vp-nix = {
      url = "github:naitokosuke/vp-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      nixpkgs,
      skills,
      vp-nix,
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
        in
        {
          default = pkgs.mkShell {
            inputsFrom = [ skills.devShells.${system}.default ];
            packages = (
              with pkgs;
              [
                actionlint
                ghalint
                gitleaks
                nixfmt
                pinact
                uv
                vp-nix.packages.${system}.default
              ]
            );
          };
        }
      );
    };
}
