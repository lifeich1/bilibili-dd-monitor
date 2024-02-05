{
  description = "一个专为bilibili dd 设计的多屏观看vtuber直播的实用工具";

  inputs = {
    nixpkgs.url = "git+https://mirrors.tuna.tsinghua.edu.cn/git/nixpkgs.git/?ref=nixos-unstable-small";
  };

  outputs = { nixpkgs, ... }:
    let
      x64linux = "x86_64-linux";
    in
    {
      devShells."${x64linux}" =
        let
          pkgs = import nixpkgs {
            system = x64linux;
          };
        in
        {
          src = pkgs.mkShell {
            packages = with pkgs; [
              nodejs_20
              corepack
              python3
              (runCommand "cn-pnpm"
                {
                  buildInputs = [
                    corepack
                  ];
                  nativeBuildInputs = [
                    makeWrapper
                  ];
                } ''
                mkdir -p $out/bin/
                ln -s ${pkgs.corepack}/bin/pnpm $out/bin/cpnpm
                wrapProgram $out/bin/cpnpm \
                  --add-flags --registry=https://registry.npmmirror.com
              '')
            ];
            shellHook = ''
              echo "node `node --version`, use cpnpm for install"
              exec $SHELL
            '';
          };
        };
    };
}
